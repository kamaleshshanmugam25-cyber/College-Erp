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
        self.assertEqual(Group.objects.count(), 5)
        self.assertTrue(Group.objects.get(name=Roles.HR_ADMIN).permissions.filter(codename="run_payroll").exists())
        self.assertFalse(Group.objects.get(name=Roles.STUDENT_PARENT).permissions.filter(codename="add_studentfee").exists())

    def test_dashboard_access_by_role(self):
        self.client.force_login(self.fin)
        r = self.client.get("/finance/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Pending Defaulters")
        self.client.force_login(self.stu)
        self.assertEqual(self.client.get("/finance/").status_code, 403)

    def test_student_sees_only_own_fees_in_portal_and_api(self):
        self.client.force_login(self.stu)
        self.assertContains(self.client.get("/portal/dues/"), "R1")
        self.assertNotContains(self.client.get("/portal/dues/"), "R2")
        self.assertEqual(self.client.get("/api/fees/").json()["count"], 1)

    def test_htmx_calculator_returns_fragment(self):
        self.client.force_login(self.fin)
        r = self.client.post("/finance/calculator/", {"course": self.course.pk, "quota": self.quota.pk,
                                                      "installments": 2}, headers={"HX-Request": "true"})
        self.assertContains(r, "81,000.00")      # 90,000 less 10% waiver
        self.assertNotContains(r, "<html")       # fragment, not a full page

    def test_anonymous_redirected_to_login(self):
        self.assertEqual(self.client.get("/finance/").status_code, 302)
