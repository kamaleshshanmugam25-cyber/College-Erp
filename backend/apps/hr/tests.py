from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.core.rbac import Roles
from .models import Attendance, Employee, LeaveApplication, Payroll
from .services import generate_payroll_batch, monthly_tds, working_days


class PayrollTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.emp = Employee.objects.create(
            staff_id="T001", user=U.objects.create_user("t1"), department="CSE", designation="Lecturer",
            employee_type="TEACHING", joining_date=date(2025, 1, 1),
            basic_salary=Decimal("30000"), hra=Decimal("12000"), allowances=Decimal("8000"))
        self.days = working_days(2026, 6)  # June 2026, Sundays off -> 26 days

    def mark_all_present(self, skip=()):
        for d in self.days:
            if d not in skip:
                Attendance.objects.create(employee=self.emp, date=d, status="PRESENT")

    def test_unapproved_absence_is_lop_and_pf_capped(self):
        gap = self.days[3]
        self.mark_all_present(skip=[gap])
        generate_payroll_batch(2026, 6)
        p = Payroll.objects.get(employee=self.emp)
        self.assertEqual((p.working_days, p.lop_days), (26, Decimal("1.00")))
        self.assertEqual(p.lop_deduction, (Decimal("50000") / 26).quantize(Decimal("0.01")))
        self.assertEqual(p.pf, Decimal("1800.00"))  # 12% of the 15,000 wage ceiling
        self.assertEqual(p.esi, Decimal("0.00"))    # gross above the ESI ceiling
        self.assertEqual(p.net_salary, p.gross_salary - p.total_deductions)

    def test_approved_paid_leave_is_not_lop_but_unpaid_is(self):
        paid, unpaid = self.days[1], self.days[2]
        self.mark_all_present(skip=[paid, unpaid])
        for d, t in ((paid, "CASUAL"), (unpaid, "UNPAID")):
            LeaveApplication.objects.create(employee=self.emp, leave_type=t, start_date=d, end_date=d, status="APPROVED")
        generate_payroll_batch(2026, 6)
        self.assertEqual(Payroll.objects.get().lop_days, Decimal("1.00"))

    def test_rerun_is_idempotent_and_disbursed_rows_are_frozen(self):
        self.mark_all_present()
        generate_payroll_batch(2026, 6)
        self.assertEqual(generate_payroll_batch(2026, 6)["updated"], 1)
        Payroll.objects.update(disbursement_status="DISBURSED")
        self.assertEqual(generate_payroll_batch(2026, 6)["skipped"], ["T001"])
        self.assertEqual(Payroll.objects.count(), 1)

    def test_tds_zero_under_rebate_limit(self):
        self.assertEqual(monthly_tds(Decimal("50000")), Decimal("0.00"))

    def test_row_level_scoping(self):
        U = get_user_model()
        other = Employee.objects.create(staff_id="T002", user=U.objects.create_user("t2"), department="CSE",
                                        designation="L", employee_type="TEACHING", joining_date=date(2025, 1, 1),
                                        basic_salary=Decimal("20000"))
        self.mark_all_present()
        generate_payroll_batch(2026, 6)
        mine = Payroll.objects.visible_to(self.emp.user)
        self.assertEqual([p.employee_id for p in mine], [self.emp.pk])
        self.assertEqual(Payroll.objects.visible_to(U.objects.create_user("anon")).count(), 0)
