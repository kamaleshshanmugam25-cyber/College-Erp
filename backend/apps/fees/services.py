import calendar
import logging
import uuid
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.models import NumberSequence
from apps.ledger.services import post_fee_receipt
from .gateways import GatewayEvent
from .models import (FeeInstallment, FeeReceipt, PaymentTransaction as Txn, StudentFee)

log = logging.getLogger(__name__)
TWO = Decimal("0.01")


def q2(x) -> Decimal:
    return Decimal(x).quantize(TWO, rounding=ROUND_HALF_UP)


class PaymentError(Exception):
    pass


class UnknownOrder(PaymentError):
    pass


# --------------------------------------------------------------------------- fee calculator
@dataclass
class FeeQuote:
    base: Decimal
    waiver_percent: Decimal
    waiver: Decimal
    total: Decimal
    schedule: list  # [(sequence, due_date, amount)]


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y, m = d.year + m // 12, m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def calculate_fee(course, quota, installments: int = 1, first_due: date = None) -> FeeQuote:
    """Pure function (no DB writes): used by the HTMX calculator AND by create_student_fee()."""
    if not 1 <= installments <= 12:
        raise ValueError("installments must be between 1 and 12")
    first_due = first_due or timezone.localdate()
    base = q2(course.annual_fee)
    waiver = q2(base * quota.waiver_percent / 100)
    total = base - waiver
    part = q2(total / installments)
    schedule = [(i + 1, add_months(first_due, i), part) for i in range(installments)]
    # Put the rounding remainder on the last instalment so the schedule sums exactly to total.
    seq, due, _ = schedule[-1]
    schedule[-1] = (seq, due, total - part * (installments - 1))
    return FeeQuote(base, quota.waiver_percent, waiver, total, schedule)


@transaction.atomic
def create_student_fee(*, student, course, quota, academic_year, installments, first_due, late_fee_rule=None):
    quote = calculate_fee(course, quota, installments, first_due)
    fee = StudentFee.objects.create(
        student=student, course=course, quota_category=quota, academic_year=academic_year,
        total_amount=quote.total, due_date=first_due, late_fee_rule=late_fee_rule)
    FeeInstallment.objects.bulk_create([
        FeeInstallment(fee=fee, sequence=s, due_date=d, amount=a) for s, d, a in quote.schedule])
    return fee


# --------------------------------------------------------------------------- payments
@transaction.atomic
def initiate_payment(*, fee: StudentFee, amount, method, gateway, user=None) -> Txn:
    """Create the INITIATED transaction. Creating the order at the gateway (Razorpay Orders /
    Cashfree PG) is a thin SDK call you add here; its id replaces the local placeholder."""
    amount = q2(amount)
    fee = StudentFee.objects.select_for_update().get(pk=fee.pk)
    if amount <= 0 or amount > fee.outstanding:
        raise PaymentError("Amount must be positive and not exceed the outstanding balance.")
    return Txn.objects.create(fee=fee, gateway=gateway, method=method, amount=amount,
                              order_id=f"ord_{uuid.uuid4().hex[:20]}", initiated_by=user)


def transition(txn: Txn, new_status: str):
    if new_status not in Txn.TRANSITIONS[txn.status]:
        raise PaymentError(f"Illegal transition {txn.status} -> {new_status}")
    txn.status = new_status


def _allocate(txn: Txn):
    """Apply a successful payment to the oldest open instalments (row-locked)."""
    remaining = txn.amount
    open_items = (FeeInstallment.objects.select_for_update()
                  .filter(fee_id=txn.fee_id).exclude(status=FeeInstallment.Status.PAID)
                  .order_by("due_date", "sequence"))
    for inst in open_items:
        if remaining <= 0:
            break
        pay = min(inst.amount - inst.paid_amount, remaining)
        inst.paid_amount += pay
        inst.status = (FeeInstallment.Status.PAID if inst.paid_amount >= inst.amount
                       else FeeInstallment.Status.PARTIAL)
        inst.save(update_fields=["paid_amount", "status", "updated_at"])
        remaining -= pay
    txn.unallocated_amount = remaining
    if remaining > 0:
        log.warning("Txn %s overpaid by %s - needs manual review", txn.order_id, remaining)


def issue_receipt(txn: Txn, generated_by=None) -> FeeReceipt:
    year = timezone.localdate().year
    number = NumberSequence.next_value(f"receipt:{year}")
    return FeeReceipt.objects.create(
        transaction=txn, generated_by=generated_by, receipt_number=f"REC-{year}-{number:04d}")


@transaction.atomic
def process_gateway_event(ev: GatewayEvent):
    """The idempotent heart of the system. Returns (txn, applied: bool).

    The transaction row is locked with SELECT ... FOR UPDATE, so if the gateway delivers the same
    webhook twice (they do: retries, parallel workers) the second delivery blocks until the first
    commits, then sees SUCCESS and becomes a no-op. Money, instalments, receipt and ledger all
    commit together or not at all.
    """
    from .tasks import generate_receipt_pdf  # local import avoids a circular import

    try:
        txn = Txn.objects.select_for_update().get(order_id=ev.order_id)
    except Txn.DoesNotExist:
        raise UnknownOrder(ev.order_id)

    if txn.status in (Txn.Status.SUCCESS, Txn.Status.RECONCILED):
        return txn, False  # duplicate delivery

    txn.webhook_payload = ev.raw
    if ev.status == "FAILED":
        if txn.status == Txn.Status.INITIATED:
            transition(txn, Txn.Status.FAILED)
        txn.failure_reason = ev.failure_reason[:255]
        txn.save()
        return txn, True

    if ev.amount != txn.amount:  # never credit an amount we did not expect
        txn.failure_reason = f"AMOUNT_MISMATCH expected {txn.amount} got {ev.amount}"
        txn.save()
        log.error("Txn %s: %s", txn.order_id, txn.failure_reason)
        return txn, False

    transition(txn, Txn.Status.SUCCESS)
    txn.gateway_txn_id, txn.paid_at, txn.failure_reason = ev.gateway_txn_id, timezone.now(), ""
    _allocate(txn)
    txn.save()
    receipt = issue_receipt(txn)
    post_fee_receipt(receipt)  # Dr Bank / Cr Fee Income, same DB transaction
    # PDF rendering is slow and failure-prone -> after commit, off the request path.
    transaction.on_commit(lambda: generate_receipt_pdf.delay(receipt.pk))
    return txn, True


@transaction.atomic
def mark_reconciled(order_ids) -> int:
    """Settlement-file reconciliation: SUCCESS -> RECONCILED."""
    n = 0
    for txn in Txn.objects.select_for_update().filter(order_id__in=order_ids, status=Txn.Status.SUCCESS):
        transition(txn, Txn.Status.RECONCILED)
        txn.save(update_fields=["status", "updated_at"])
        n += 1
    return n
