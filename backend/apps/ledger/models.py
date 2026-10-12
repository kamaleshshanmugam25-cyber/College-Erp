from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class VoucherType(models.TextChoices):
    RECEIPT = "RECEIPT", "Receipt"
    PAYMENT = "PAYMENT", "Payment"
    JOURNAL = "JOURNAL", "Journal"


class AccountGroup(models.TextChoices):
    BANK = "BANK", "Bank & Cash"
    FEE_INCOME = "FEE_INCOME", "Fee Income"
    SALARY_EXPENSE = "SALARY_EXPENSE", "Salary Expense"
    VENDOR_EXPENSE = "VENDOR_EXPENSE", "Vendor / Operating Expense"
    PF_PAYABLE = "PF_PAYABLE", "PF Payable"
    ESI_PAYABLE = "ESI_PAYABLE", "ESI Payable"
    TDS_PAYABLE = "TDS_PAYABLE", "TDS Payable"
    SALARY_PAYABLE = "SALARY_PAYABLE", "Salary Payable"


# Debit-nature accounts grow with debits (assets, expenses); the rest grow with credits.
DEBIT_NATURE = {AccountGroup.BANK, AccountGroup.SALARY_EXPENSE, AccountGroup.VENDOR_EXPENSE}
EXPENSE_GROUPS = (AccountGroup.SALARY_EXPENSE, AccountGroup.VENDOR_EXPENSE)


class JournalVoucher(TimeStampedModel):
    """Header of a balanced double-entry posting. Immutable: corrections are contra vouchers."""
    voucher_no = models.CharField(max_length=32, unique=True)
    voucher_type = models.CharField(max_length=10, choices=VoucherType.choices)
    date = models.DateField(db_index=True)
    narration = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=64, blank=True)  # e.g. "receipt:REC-2026-0001"

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["voucher_type", "reference"], condition=~Q(reference=""),
            name="uniq_voucher_reference")]  # makes posting idempotent per source document

    def delete(self, *a, **kw):
        raise PermissionError("Vouchers are immutable; post a reversing voucher instead.")


class AccountBalance(models.Model):
    """One locked row per account group: serialises running-balance updates."""
    account_group = models.CharField(max_length=20, choices=AccountGroup.choices, unique=True)
    balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)


class GeneralLedger(TimeStampedModel):
    voucher = models.ForeignKey(JournalVoucher, on_delete=models.PROTECT, related_name="lines")
    date = models.DateField(db_index=True)
    voucher_type = models.CharField(max_length=10, choices=VoucherType.choices)
    account_group = models.CharField(max_length=20, choices=AccountGroup.choices)
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    running_balance = models.DecimalField(max_digits=16, decimal_places=2)

    class Meta:
        indexes = [models.Index(fields=["account_group", "date"]),
                   models.Index(fields=["voucher_type", "date"])]
        constraints = [models.CheckConstraint(
            condition=(Q(debit__gt=0, credit=0) | Q(credit__gt=0, debit=0)),
            name="ledger_line_single_sided")]

    def delete(self, *a, **kw):
        raise PermissionError("Ledger rows are immutable.")
