from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase

from apps.core.rbac import Roles
from apps.fees.models import Course, QuotaCategory, Student
from apps.fees.services import create_student_fee


class RbacAndViewTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("setup_rbac", verbosity=0)
        U = get_user_model()
        cls.fin = U.objects.create_user("fin")
        cls.fin.groups.add(Group.objects.get(name=Roles.FINANCE_ADMIN))
        cls.stu = U.objects.create_user("stu")
        cls.stu.groups.add(Group.objects.get(name=Roles.STUDENT_PARENT))
        cls.other = U.objects.create_user("other")
        cls.other.groups.add(Group.objects.get(name=Roles.STUDENT_PARENT))
        cls.course = Course.objects.create(code="ME", name="Mech", annual_fee=Decimal("90000"))
        cls.quota = QuotaCategory.objects.create(code="M", name="Merit", waiver_percent=Decimal("10"))
        for u, roll in ((cls.stu, "R1"), (cls.other, "R2")):
            s = Student.objects.create(user=u, roll_no=roll, name=roll)
            create_student_fee(student=s, course=cls.course, quota=cls.quota, academic_year="2026-27",
                               installments=2, first_due=date(2026, 8, 1))

    def test_roles_created_with_expected_permissions(self):
        self.assertEqual(Group.objects.count(), 7)
        self.assertTrue(Group.objects.get(name=Roles.HR_ADMIN).permissions.filter(codename="run_payroll").exists())
        self.assertFalse(Group.objects.get(name=Roles.STUDENT_PARENT).permissions.filter(codename="add_studentfee").exists())

    def test_dashboard_access_by_role(self):
        self.client.force_login(self.fin)
        r = self.client.get("/api/finance/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.client.force_login(self.stu)
        self.assertEqual(self.client.get("/api/finance/dashboard/").status_code, 403)

    def test_student_sees_only_own_fees_in_portal_and_api(self):
        self.client.force_login(self.stu)
        r = self.client.get("/api/portal/dues/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["student_info"]["roll_no"], "R1")
        self.assertEqual(self.client.get("/api/fees/").json()["count"], 1)

    def test_fee_calculator_api(self):
        self.client.force_login(self.fin)
        r = self.client.post("/api/finance/calculator/", {"course": self.course.pk, "quota": self.quota.pk,
                                                          "installments": 2}, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["total"], 81000.0)

    def test_anonymous_forbidden_on_protected_endpoints(self):
        self.assertEqual(self.client.get("/api/finance/dashboard/").status_code, 403)

    def test_auth_bypass_demo_role_rejected(self):
        # BUG-001 regression test: demo_role without password must be rejected
        r = self.client.post("/api/auth/login/", {"demo_role": "Super Admin"}, content_type="application/json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Password authentication is required", r.json()["error"])

    def test_ledger_anonymous_access_forbidden(self):
        # BUG-002 regression test: General Ledger and Journal Vouchers must reject anonymous access
        self.assertEqual(self.client.get("/api/ledger/general/").status_code, 403)
        self.assertEqual(self.client.get("/api/ledger/vouchers/").status_code, 403)
        self.assertEqual(self.client.post("/api/ledger/vouchers/", {"voucher_type": "JOURNAL"}, content_type="application/json").status_code, 403)

    def test_hr_appraisals_anonymous_access_forbidden(self):
        # BUG-003 regression test: Staff appraisals must reject anonymous access
        self.assertEqual(self.client.get("/api/hr/employees/appraisals/").status_code, 403)

    def test_holidays_anonymous_mutation_forbidden(self):
        # BUG-004 regression test: Holiday creation must reject anonymous access
        r = self.client.post("/api/holidays/", {"name": "Test", "date": "2026-12-01"}, content_type="application/json")
        self.assertEqual(r.status_code, 403)
