from django.conf import settings
from django.db import models, transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.core.models import BaseModel, ScopedQuerySet, alive_manager
from apps.core.rbac import Roles

User = settings.AUTH_USER_MODEL
Money = lambda **kw: models.DecimalField(max_digits=12, decimal_places=2, **kw)  # noqa: E731


class HrScopedQS(ScopedQuerySet):
    admin_groups = (Roles.HR_ADMIN,)
    owner_lookups = ("employee__user",)


class EmployeeScopedQS(ScopedQuerySet):
    admin_groups = (Roles.HR_ADMIN,)
    owner_lookups = ("user",)


class Employee(BaseModel):
    class Type(models.TextChoices):
        TEACHING = "TEACHING"
        NON_TEACHING = "NON_TEACHING", "Non-teaching"
        CONTRACT = "CONTRACT"

    class LifecycleStatus(models.TextChoices):
        PROBATION = "PROBATION", "On Probation"
        CONFIRMED = "CONFIRMED", "Confirmed / Active"
        NOTICE_PERIOD = "NOTICE_PERIOD", "Notice Period"
        RELIEVED = "RELIEVED", "Relieved / Exited"

    staff_id = models.CharField(max_length=20, unique=True)
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name="employee_profile")
    department = models.CharField(max_length=100, db_index=True)
    designation = models.CharField(max_length=100)
    employee_type = models.CharField(max_length=14, choices=Type.choices)
    lifecycle_status = models.CharField(
        max_length=16,
        choices=LifecycleStatus.choices,
        default=LifecycleStatus.CONFIRMED,
        db_index=True,
    )
    joining_date = models.DateField()
    is_active = models.BooleanField(default=True)
    # Salary structure (monthly, full month)
    basic_salary = Money()
    hra = Money(default=0)
    allowances = Money(default=0)
    pf_applicable = models.BooleanField(default=True)
    # Bank details. In production store account_number encrypted (e.g. django-fernet-fields /
    # KMS envelope) - never log it, and show only `masked_account` in UIs.
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=34, blank=True)
    ifsc = models.CharField(max_length=11, blank=True)

    objects = alive_manager(EmployeeScopedQS)

    @property
    def masked_account(self):
        return "•" * max(len(self.account_number) - 4, 0) + self.account_number[-4:]

    @property
    def gross(self):
        return self.basic_salary + self.hra + self.allowances

    def __str__(self):
        return f"{self.staff_id} {self.user.get_full_name() or self.user.get_username()}"


class Holiday(BaseModel):
    class Type(models.TextChoices):
        NATIONAL = "NATIONAL", "National Holiday"
        FESTIVAL = "FESTIVAL", "Festival / Public Holiday"
        ACADEMIC = "ACADEMIC", "Academic Break / Recess"
        RESTRICTED = "RESTRICTED", "Restricted Holiday"

    date = models.DateField(unique=True)
    name = models.CharField(max_length=100)
    holiday_type = models.CharField(max_length=20, choices=Type.choices, default=Type.FESTIVAL)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.name} ({self.date})"



class Attendance(BaseModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT"
        ABSENT = "ABSENT"
        HALF_DAY = "HALF_DAY", "Half day"
        ON_DUTY = "ON_DUTY", "On duty"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices)

    objects = alive_manager(HrScopedQS)

    class Meta:
        ordering = ["-id"]
        constraints = [models.UniqueConstraint(fields=["employee", "date"], condition=Q(is_deleted=False),
                                               name="uniq_attendance_per_day")]
        indexes = [models.Index(fields=["employee", "date"])]


class LeaveApplication(BaseModel):
    class Type(models.TextChoices):
        CASUAL = "CASUAL"
        SICK = "SICK"
        EARNED = "EARNED"
        UNPAID = "UNPAID"

    class Status(models.TextChoices):
        PENDING = "PENDING"
        APPROVED = "APPROVED"
        REJECTED = "REJECTED"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leaves")
    leave_type = models.CharField(max_length=8, choices=Type.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=9, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    decided_at = models.DateTimeField(null=True, blank=True)

    objects = alive_manager(HrScopedQS)

    class Meta:
        ordering = ["-id"]
        permissions = [("approve_leave", "Can approve or reject leave")]
        constraints = [models.CheckConstraint(condition=Q(end_date__gte=F("start_date")),
                                              name="leave_end_after_start")]
        indexes = [models.Index(fields=["status", "start_date"])]

    @property
    def is_paid(self):
        return self.leave_type != self.Type.UNPAID

    @transaction.atomic
    def decide(self, approver, approve: bool):
        """Row-locked so two approvers can't both decide the same request."""
        leave = LeaveApplication.objects.select_for_update().get(pk=self.pk)
        if leave.status != self.Status.PENDING:
            raise ValueError("Leave already decided.")
        leave.status = self.Status.APPROVED if approve else self.Status.REJECTED
        leave.approved_by, leave.decided_at = approver, timezone.now()
        leave.save(update_fields=["status", "approved_by", "decided_at", "updated_at"])
        return leave


class Payroll(BaseModel):
    class Disbursement(models.TextChoices):
        PENDING = "PENDING"
        PROCESSED = "PROCESSED"
        DISBURSED = "DISBURSED"
        FAILED = "FAILED"

    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payrolls")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    working_days = models.PositiveSmallIntegerField()
    lop_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    basic_salary = Money()
    hra = Money()
    allowances = Money()
    gross_salary = Money()
    pf = Money(default=0)
    esi = Money(default=0)
    tds = Money(default=0)
    lop_deduction = Money(default=0)
    total_deductions = Money(default=0)
    net_salary = Money()
    disbursement_status = models.CharField(max_length=10, choices=Disbursement.choices,
                                           default=Disbursement.PENDING)

    objects = alive_manager(HrScopedQS)

    class Meta:
        ordering = ["-id"]
        permissions = [("run_payroll", "Can run payroll")]
        constraints = [
            models.UniqueConstraint(fields=["employee", "year", "month"], condition=Q(is_deleted=False),
                                    name="uniq_payroll_per_month"),
            models.CheckConstraint(condition=Q(net_salary__gte=0), name="payroll_net_non_negative"),
        ]
        indexes = [models.Index(fields=["year", "month", "disbursement_status"])]


class EmployeeAppraisal(BaseModel):
    class Rating(models.TextChoices):
        OUTSTANDING = "OUTSTANDING", "5.0 - Outstanding"
        EXCEEDS = "EXCEEDS", "4.0 - Exceeds Expectations"
        MEETS = "MEETS", "3.0 - Meets Expectations"
        NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT", "2.0 - Needs Improvement"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="appraisals")
    review_cycle = models.CharField(max_length=100, default="2026 Annual Appraisal")
    rating = models.CharField(max_length=20, choices=Rating.choices, default=Rating.EXCEEDS)
    kpi_score = models.DecimalField(max_digits=5, decimal_places=2, default=90.0)
    attendance_score = models.DecimalField(max_digits=5, decimal_places=2, default=95.0)
    increment_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.0)
    previous_gross = Money()
    revised_gross = Money()
    previous_designation = models.CharField(max_length=100)
    revised_designation = models.CharField(max_length=100)
    comments = models.TextField(blank=True)
    appraised_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    appraised_at = models.DateTimeField(default=timezone.now)

    objects = alive_manager(HrScopedQS)

    class Meta:
        ordering = ["-id"]

