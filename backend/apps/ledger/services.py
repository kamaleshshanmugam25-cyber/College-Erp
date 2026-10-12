"""Double-entry posting. Every public function must be called inside (or opens) a transaction."""
import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.models import NumberSequence
from .models import (DEBIT_NATURE, AccountBalance, AccountGroup, GeneralLedger,
                     JournalVoucher, VoucherType)

log = logging.getLogger(__name__)
PREFIX = {VoucherType.RECEIPT: "RV", VoucherType.PAYMENT: "PV", VoucherType.JOURNAL: "JV"}
ZERO = Decimal("0.00")


class LedgerError(Exception):
    pass


@transaction.atomic
def post_voucher(*, voucher_type, entries, date=None, narration="", reference="") -> JournalVoucher:
    """entries: iterable of (account_group, debit, credit). Debits must equal credits.
    If `reference` was already posted for this voucher_type, the existing voucher is returned
    (idempotent), so retries / duplicate webhooks can never double-post."""
    entries = [(a, Decimal(d), Decimal(c)) for a, d, c in entries]
    if len(entries) < 2:
        raise LedgerError("A voucher needs at least two lines.")
    for _, d, c in entries:
        if d < 0 or c < 0 or (d > 0) == (c > 0):
            raise LedgerError("Each line must have exactly one positive side.")
    if sum(d for _, d, _ in entries) != sum(c for _, _, c in entries):
        raise LedgerError("Voucher is not balanced.")

    if reference:
        existing = JournalVoucher.objects.filter(voucher_type=voucher_type, reference=reference).first()
        if existing:
            return existing

    date = date or timezone.localdate()
    # Lock balance rows in a stable order so concurrent postings can't deadlock.
    balances = {}
    for group in sorted({a for a, _, _ in entries}):
        AccountBalance.objects.get_or_create(account_group=group)
        balances[group] = AccountBalance.objects.select_for_update().get(account_group=group)

    n = NumberSequence.next_value(f"voucher:{voucher_type}:{date.year}")
    voucher = JournalVoucher.objects.create(
        voucher_no=f"{PREFIX[voucher_type]}-{date.year}-{n:05d}", voucher_type=voucher_type,
        date=date, narration=narration[:255], reference=reference)

    rows = []
    for group, debit, credit in entries:
        bal = balances[group]
        bal.balance += (debit - credit) if group in DEBIT_NATURE else (credit - debit)
        rows.append(GeneralLedger(voucher=voucher, date=date, voucher_type=voucher_type,
                                  account_group=group, debit=debit, credit=credit,
                                  running_balance=bal.balance))
    GeneralLedger.objects.bulk_create(rows)
    for bal in balances.values():
        bal.save(update_fields=["balance"])
    return voucher


def post_fee_receipt(receipt) -> JournalVoucher:
    """Fee received: Dr Bank / Cr Fee Income."""
    amount = receipt.transaction.amount
    return post_voucher(
        voucher_type=VoucherType.RECEIPT, reference=f"receipt:{receipt.receipt_number}",
        narration=f"Fee receipt {receipt.receipt_number}",
        entries=[(AccountGroup.BANK, amount, ZERO), (AccountGroup.FEE_INCOME, ZERO, amount)])


def post_vendor_expense(*, vendor: str, amount, reference: str, date=None,
                        expense_group=AccountGroup.VENDOR_EXPENSE) -> JournalVoucher:
    """Vendor expense paid: Dr Expense / Cr Bank. `reference` (e.g. invoice no.) makes it idempotent."""
    amount = Decimal(amount)
    return post_voucher(
        voucher_type=VoucherType.PAYMENT, reference=f"vendor:{reference}", date=date,
        narration=f"Vendor payment - {vendor}",
        entries=[(expense_group, amount, ZERO), (AccountGroup.BANK, ZERO, amount)])
