from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.core.models import BaseModel, ScopedQuerySet, alive_manager
from apps.core.rbac import Roles

Money = lambda **kw: models.DecimalField(max_digits=12, decimal_places=2, **kw)  # noqa: E731
User = settings.AUTH_USER_MODEL


class FeeScopedQS(ScopedQuerySet):
    admin_groups = (Roles.FINANCE_ADMIN,)
    owner_lookups = ("student__user", "student__guardians")


class Student(BaseModel):
    """Minimal student record; replace/extend with your SIS model if you already have one."""
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name="student_profile")
    roll_no = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=150)
    course = models.ForeignKey("Course", null=True, blank=True, on_delete=models.SET_NULL, related_name="students")
    guardians = models.ManyToManyField(User, blank=True, related_name="wards")  # parent logins

    def __str__(self):
        return f"{self.name} ({self.roll_no})"


class Course(BaseModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    annual_fee = Money()

    def __str__(self):
        return self.code


class QuotaCategory(BaseModel):
    """Seat/quota category with a fee waiver, e.g. Merit 25%, Management 0%."""
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    waiver_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return self.name


class LateFeeRule(BaseModel):
    name = models.CharField(max_length=100)
    grace_days = models.PositiveSmallIntegerField(default=0)
    per_day_amount = Money(default=0)
    max_amount = Money(default=0)  # cap; 0 = no late fee

    def late_fee(self, outstanding: Decimal, due_date, as_of) -> Decimal:
        days = (as_of - due_date).days - self.grace_days
        if days <= 0 or outstanding <= 0:
            return Decimal("0.00")
        return min(self.per_day_amount * days, self.max_amount)

    def __str__(self):
        return self.name


class StudentFee(BaseModel):
    academic_year = models.CharField(max_length=9)  # "2025-26"
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="fees")
    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    quota_category = models.ForeignKey(QuotaCategory, on_delete=models.PROTECT)
    total_amount = Money()
    due_date = models.DateField()
    late_fee_rule = models.ForeignKey(LateFeeRule, null=True, blank=True, on_delete=models.SET_NULL)

    objects = alive_manager(FeeScopedQS)

    class Meta:
        ordering = ["-id"]
        permissions = [("view_financial_analytics", "Can view financial analytics")]
        constraints = [
            models.UniqueConstraint(fields=["student", "academic_year", "course"],
                                    condition=Q(is_deleted=False), name="uniq_fee_per_student_year_course"),
            models.CheckConstraint(condition=Q(total_amount__gte=0), name="fee_total_non_negative"),
        ]
        indexes = [models.Index(fields=["academic_year", "due_date"])]

    @property
    def outstanding(self) -> Decimal:
        agg = self.installments.aggregate(t=models.Sum("amount"), p=models.Sum("paid_amount"))
        return (agg["t"] or 0) - (agg["p"] or 0)


class InstallmentScopedQS(ScopedQuerySet):
    admin_groups = (Roles.FINANCE_ADMIN,)
    owner_lookups = ("fee__student__user", "fee__student__guardians")


class FeeInstallment(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING"
        PARTIAL = "PARTIAL"
        PAID = "PAID"

    fee = models.ForeignKey(StudentFee, on_delete=models.CASCADE, related_name="installments")
    sequence = models.PositiveSmallIntegerField()
    due_date = models.DateField()
    amount = Money()
    paid_amount = Money(default=0)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)

    objects = alive_manager(InstallmentScopedQS)

    class Meta:
        ordering = ["fee_id", "sequence"]
        constraints = [
            models.UniqueConstraint(fields=["fee", "sequence"], condition=Q(is_deleted=False),
                                    name="uniq_installment_sequence"),
            models.CheckConstraint(condition=Q(paid_amount__lte=F("amount")), name="installment_not_overpaid"),
        ]
        indexes = [models.Index(fields=["status", "due_date"])]  # defaulter queries

    @property
    def balance(self):
        return self.amount - self.paid_amount


class TxnScopedQS(ScopedQuerySet):
    admin_groups = (Roles.FINANCE_ADMIN,)
    owner_lookups = ("fee__student__user", "fee__student__guardians")


class PaymentTransaction(BaseModel):
    class Method(models.TextChoices):
        UPI = "UPI"
        CARD = "CARD"
        NET_BANKING = "NET_BANKING", "Net Banking"

    class Status(models.TextChoices):
        INITIATED = "INITIATED"
        SUCCESS = "SUCCESS"
        FAILED = "FAILED"
        RECONCILED = "RECONCILED"

    # Allowed transitions: the state machine enforced by services.transition().
    TRANSITIONS = {
        "INITIATED": {"SUCCESS", "FAILED"},
        "FAILED": {"SUCCESS"},        # gateways sometimes capture after a reported failure
        "SUCCESS": {"RECONCILED"},
        "RECONCILED": set(),
    }

    fee = models.ForeignKey(StudentFee, on_delete=models.PROTECT, related_name="transactions")
    gateway = models.CharField(max_length=20)              # razorpay | cashfree
    order_id = models.CharField(max_length=64, unique=True)
    gateway_txn_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    amount = Money()
    method = models.CharField(max_length=12, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.INITIATED)
    unallocated_amount = Money(default=0)                  # paid beyond what was due -> manual review
    failure_reason = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    webhook_payload = models.JSONField(default=dict, blank=True)
    initiated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    objects = alive_manager(TxnScopedQS)

    class Meta:
        ordering = ["-id"]
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="txn_amount_positive")]
        indexes = [models.Index(fields=["status", "paid_at"]), models.Index(fields=["fee", "status"])]


class ReceiptScopedQS(ScopedQuerySet):
    admin_groups = (Roles.FINANCE_ADMIN,)
    owner_lookups = ("transaction__fee__student__user", "transaction__fee__student__guardians")


class FeeReceipt(BaseModel):
    receipt_number = models.CharField(max_length=20, unique=True)  # REC-YYYY-XXXX
    transaction = models.OneToOneField(PaymentTransaction, on_delete=models.PROTECT, related_name="receipt")
    timestamp = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name="+")  # NULL = system (webhook)
    pdf_file = models.FileField(upload_to="receipts/%Y/%m/", blank=True)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)

    objects = alive_manager(ReceiptScopedQS)

    class Meta:
        ordering = ["-id"]

