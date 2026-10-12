import hashlib
import hmac
import json
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.ledger.models import AccountBalance, GeneralLedger
from .gateways import verify_razorpay
from .models import (Course, FeeInstallment, FeeReceipt, PaymentTransaction as Txn, QuotaCategory, Student)
from .services import calculate_fee, create_student_fee, initiate_payment

SECRET = "whsec_test"


def signed(payload: dict):
    body = json.dumps(payload).encode()
    return body, hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()


@override_settings(PAYMENT_GATEWAYS={"razorpay": {"webhook_secret": SECRET}, "cashfree": {"webhook_secret": ""}})
class WebhookTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.student = Student.objects.create(user=U.objects.create_user("stu"), roll_no="R1", name="Arun")
        course = Course.objects.create(code="ME", name="Mech", annual_fee=Decimal("100000"))
        quota = QuotaCategory.objects.create(code="M", name="Merit", waiver_percent=Decimal("25"))
        self.fee = create_student_fee(student=self.student, course=course, quota=quota, academic_year="2026-27",
                                      installments=3, first_due=date(2026, 8, 1))
        self.txn = initiate_payment(fee=self.fee, amount=Decimal("25000"), method="UPI", gateway="razorpay")

    def payload(self, event="payment.captured", paise=2500000):
        return {"event": event, "payload": {"payment": {"entity": {
            "id": "pay_1", "order_id": self.txn.order_id, "amount": paise}}}}

    def post(self, body, sig):
        return self.client.post("/webhooks/razorpay/", body, content_type="application/json",
                                headers={"X-Razorpay-Signature": sig})

    def test_calculator_waiver_and_exact_split(self):
        q = calculate_fee(self.fee.course, self.fee.quota_category, 3, date(2026, 8, 31))
        self.assertEqual(q.total, Decimal("75000.00"))
        self.assertEqual(sum(a for _, _, a in q.schedule), q.total)
        self.assertEqual(q.schedule[1][1], date(2026, 9, 30))  # month-end clamping

    def test_bad_signature_rejected(self):
        body, _ = signed(self.payload())
        self.assertEqual(self.post(body, "deadbeef").status_code, 401)
        self.txn.refresh_from_db()
        self.assertEqual(self.txn.status, Txn.Status.INITIATED)

    def test_duplicate_webhook_credits_once(self):
        body, sig = signed(self.payload())
        first, second = self.post(body, sig), self.post(body, sig)
        self.assertEqual(first.json()["status"], "applied")
        self.assertEqual(second.json()["status"], "duplicate")
        self.txn.refresh_from_db()
        self.assertEqual(self.txn.status, Txn.Status.SUCCESS)
        self.assertEqual(FeeReceipt.objects.count(), 1)
        self.assertEqual(FeeReceipt.objects.get().receipt_number[:4], "REC-")
        inst = FeeInstallment.objects.filter(fee=self.fee).order_by("sequence")
        self.assertEqual([i.status for i in inst], ["PAID", "PENDING", "PENDING"])  # 25,000 = instalment 1
        # double-entry: Dr Bank 25,000 / Cr Fee Income 25,000, posted once
        self.assertEqual(GeneralLedger.objects.count(), 2)
        self.assertEqual(AccountBalance.objects.get(account_group="BANK").balance, Decimal("25000.00"))

    def test_amount_mismatch_is_not_credited(self):
        body, sig = signed(self.payload(paise=100))
        self.post(body, sig)
        self.txn.refresh_from_db()
        self.assertEqual(self.txn.status, Txn.Status.INITIATED)
        self.assertIn("AMOUNT_MISMATCH", self.txn.failure_reason)
        self.assertEqual(FeeReceipt.objects.count(), 0)

    def test_verify_requires_secret(self):
        self.assertFalse(verify_razorpay(b"x", "anything", ""))
