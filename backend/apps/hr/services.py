"""Leave-linked payroll engine."""
import calendar
import logging
from collections import defaultdict
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Attendance, Employee, Holiday, LeaveApplication, Payroll

log = logging.getLogger(__name__)
ZERO, HALF, TWO = Decimal("0"), Decimal("0.5"), Decimal("0.01")
CFG = lambda: settings.PAYROLL  # noqa: E731  (read lazily so tests can override_settings)


def q2(x) -> Decimal:
    return Decimal(x).quantize(TWO, rounding=ROUND_HALF_UP)


class PayrollError(Exception):
    pass


def month_range(year, month):
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


def working_days(year, month) -> list:
    """Calendar days minus weekly offs minus declared holidays."""
    first, last = month_range(year, month)
    holidays = set(Holiday.objects.filter(date__range=(first, last)).values_list("date", flat=True))
    off = CFG()["WEEKLY_OFF_DAYS"]
    days, d = [], first
    while d <= last:
        if d.weekday() not in off and d not in holidays:
            days.append(d)
        d += timedelta(days=1)
    return days


def compute_lop(emp, wdays, att_by_day, leave_by_day) -> Decimal:
    """Loss-of-Pay days for one employee.

    Per working day:  approved paid leave -> paid | approved unpaid leave -> 1 LOP
                      HALF_DAY -> 0.5 LOP        | ABSENT or no record (unapproved) -> 1 LOP
                      PRESENT / ON_DUTY -> paid  | before joining date -> 1 LOP (pro-rata)
    """
    lop = ZERO
    for d in wdays:
        if d < emp.joining_date:
            lop += 1
            continue
        leave = leave_by_day.get(d)
        if leave is not None:
            lop += 0 if leave.is_paid else 1
            continue
        status = att_by_day.get(d)
        if status in (Attendance.Status.PRESENT, Attendance.Status.ON_DUTY):
            continue
        lop += HALF if status == Attendance.Status.HALF_DAY else 1
    return lop


def annual_tax(taxable: Decimal) -> Decimal:
    tax, lower = ZERO, ZERO
    for upper, rate in CFG()["TDS_SLABS"]:
        if taxable <= lower:
            break
        top = taxable if upper is None else min(taxable, upper)
        tax += (top - lower) * rate
        lower = top
    return tax


def monthly_tds(gross_monthly: Decimal) -> Decimal:
    """Projected-annual-income method; no investments/declarations considered (extend per employee)."""
    c = CFG()
    taxable = max(gross_monthly * 12 - c["STANDARD_DEDUCTION"], ZERO)
    tax = ZERO if taxable <= c["REBATE_LIMIT"] else annual_tax(taxable)  # s.87A-style rebate
    return q2(tax * (1 + c["CESS"]) / 12)


def compute_line(emp, wdays_count, lop_days) -> dict:
    c = CFG()
    gross = emp.gross
    lop_amount = q2(gross * lop_days / wdays_count) if wdays_count else ZERO
    earned_basic = emp.basic_salary - q2(emp.basic_salary * lop_days / wdays_count) if wdays_count else ZERO
    earned_gross = gross - lop_amount

    pf = q2(min(earned_basic, c["PF_WAGE_CEILING"]) * c["PF_RATE"]) if emp.pf_applicable else ZERO
    esi = q2(earned_gross * c["ESI_RATE"]) if 0 < gross <= c["ESI_GROSS_CEILING"] else ZERO
    tds = monthly_tds(gross)
    tds = min(tds, max(earned_gross - pf - esi, ZERO))  # never push net pay negative

    total = lop_amount + pf + esi + tds
    return dict(working_days=wdays_count, lop_days=lop_days, basic_salary=emp.basic_salary, hra=emp.hra,
                allowances=emp.allowances, gross_salary=gross, pf=pf, esi=esi, tds=tds,
                lop_deduction=lop_amount, total_deductions=total, net_salary=gross - total)


@transaction.atomic
def generate_payroll_batch(year: int, month: int, employees=None, allow_open_month=False) -> dict:
    """Compute payroll for every active employee in ONE atomic transaction (all-or-nothing).
    Attendance/leave are bulk-loaded (3 queries total), not per employee. Re-runnable: PENDING /
    FAILED rows are recalculated, PROCESSED / DISBURSED rows are never touched."""
    first, last = month_range(year, month)
    if last >= timezone.localdate() and not allow_open_month:
        raise PayrollError("Month has not ended; attendance is incomplete.")

    wdays = working_days(year, month)
    emps = list(employees if employees is not None else
                Employee.objects.filter(is_active=True, joining_date__lte=last).select_related("user"))
    ids = [e.pk for e in emps]

    att = defaultdict(dict)
    for e_id, d, s in Attendance.objects.filter(employee_id__in=ids, date__range=(first, last)) \
            .values_list("employee_id", "date", "status"):
        att[e_id][d] = s
    leaves = defaultdict(dict)
    for lv in LeaveApplication.objects.filter(employee_id__in=ids, status=LeaveApplication.Status.APPROVED,
                                              start_date__lte=last, end_date__gte=first):
        d = max(lv.start_date, first)
        while d <= min(lv.end_date, last):
            leaves[lv.employee_id][d] = lv
            d += timedelta(days=1)

    existing = {p.employee_id: p for p in Payroll.objects.select_for_update().filter(year=year, month=month)}
    create, update, skipped = [], [], []
    for emp in emps:
        line = compute_line(emp, len(wdays), compute_lop(emp, wdays, att[emp.pk], leaves[emp.pk]))
        row = existing.get(emp.pk)
        if row is None:
            create.append(Payroll(employee=emp, year=year, month=month, **line))
        elif row.disbursement_status in (Payroll.Disbursement.PENDING, Payroll.Disbursement.FAILED):
            for k, v in line.items():
                setattr(row, k, v)
            row.updated_at = timezone.now()  # bulk_update skips auto_now
            update.append(row)
        else:
            skipped.append(emp.staff_id)
    Payroll.objects.bulk_create(create)
    if update:
        Payroll.objects.bulk_update(update, list(line) + ["updated_at"])
    log.info("Payroll %s-%02d: %d created, %d updated, %d skipped", year, month,
             len(create), len(update), len(skipped))
    return {"created": len(create), "updated": len(update), "skipped": skipped}
