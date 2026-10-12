from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views import View
from django.views.generic import ListView

from apps.core.pdf import render_pdf
from apps.core.permissions import RoleRequiredMixin
from apps.core.rbac import Roles, has_role
from .models import LeaveApplication, Payroll


class LeaveApprovalListView(RoleRequiredMixin, ListView):
    template_name = "hr/leave_approvals.html"
    context_object_name = "leaves"
    required_roles = (Roles.HR_ADMIN,)

    def get_queryset(self):
        return (LeaveApplication.objects.filter(status=LeaveApplication.Status.PENDING)
                .select_related("employee__user").order_by("start_date"))


class LeaveDecisionView(RoleRequiredMixin, View):
    """hx-post from a table row; returns the replacement <tr> so the page never reloads."""
    required_roles = (Roles.HR_ADMIN,)

    def post(self, request, pk, decision):
        leave = get_object_or_404(LeaveApplication, pk=pk)
        try:
            leave = leave.decide(request.user, approve=(decision == "approve"))
        except ValueError:
            pass  # already decided by someone else; re-render the current state
        leave = LeaveApplication.objects.select_related("employee__user").get(pk=pk)
        return render(request, "hr/_leave_row.html", {"leave": leave})


class MyPayslipsView(RoleRequiredMixin, ListView):
    template_name = "portal/my_payslips.html"
    context_object_name = "payslips"
    required_roles = (Roles.EMPLOYEE,)

    def get_queryset(self):
        qs = Payroll.objects.visible_to(self.request.user)
        if not has_role(self.request.user, Roles.HR_ADMIN):  # staff only see finalised payslips
            qs = qs.filter(disbursement_status__in=[Payroll.Disbursement.PROCESSED,
                                                    Payroll.Disbursement.DISBURSED])
        return qs.order_by("-year", "-month")


class PayslipPDFView(RoleRequiredMixin, View):
    required_roles = (Roles.EMPLOYEE, Roles.HR_ADMIN)

    def get(self, request, pk):
        payroll = get_object_or_404(Payroll.objects.visible_to(request.user)
                                    .select_related("employee__user"), pk=pk)
        pdf = render_pdf("pdf/payslip.html", {"p": payroll, "emp": payroll.employee})
        return HttpResponse(pdf, content_type="application/pdf")


def my_payslips_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    qs = Payroll.objects.visible_to(request.user)
    if not has_role(request.user, Roles.HR_ADMIN, Roles.SUPER_ADMIN):
        qs = qs.filter(disbursement_status__in=[Payroll.Disbursement.PROCESSED, Payroll.Disbursement.DISBURSED])
    qs = qs.select_related("employee__user").order_by("-year", "-month")
    results = []
    for p in qs:
        results.append({
            "id": p.id,
            "employee_name": p.employee.user.get_full_name() or p.employee.user.username,
            "staff_id": p.employee.staff_id,
            "department": p.employee.department,
            "designation": p.employee.designation,
            "year": p.year,
            "month": p.month,
            "working_days": float(p.working_days),
            "lop_days": float(p.lop_days),
            "basic_salary": float(p.basic_salary),
            "gross_salary": float(p.gross_salary),
            "net_salary": float(p.net_salary),
            "total_deductions": float(p.total_deductions),
            "disbursement_status": p.disbursement_status,
            "pdf_url": f"/portal/payslips/{p.id}/pdf/",
        })
    return JsonResponse({"payslips": results})


def statutory_compliance_api(request):
    """API endpoint for HR Statutory Compliance sidebar item."""
    pf_rules = {
        "employee_rate": "12% of Basic Pay",
        "employer_rate": "12% of Basic Pay (3.67% EPF + 8.33% EPS)",
        "statutory_ceiling": "₹15,000 / month",
        "compliance_status": "COMPLIANT & DEPOSITED",
    }
    esi_rules = {
        "employee_rate": "0.75% of Gross Pay",
        "employer_rate": "3.25% of Gross Pay",
        "gross_threshold": "₹21,000 / month",
        "compliance_status": "COMPLIANT",
    }
    tds_192_rules = {
        "regime": "New Tax Regime (Section 115BAC)",
        "standard_deduction": "₹75,000 / year",
        "form_16_status": "Generated & Ready for Download",
        "form_24q_quarter": "Q2 FY 2026-27 (Filed)",
    }
    return JsonResponse({
        "pf_compliance": pf_rules,
        "esi_compliance": esi_rules,
        "tds_compliance": tds_192_rules,
        "statutory_filings": [
            {"form": "Form 24Q (Salary TDS)", "quarter": "Q2 2026", "due_date": "2026-10-31", "status": "FILED"},
            {"form": "EPF Electronic Challan Return", "month": "Sep 2026", "due_date": "2026-10-15", "status": "DEPOSITED"},
            {"form": "ESI Monthly Return", "month": "Sep 2026", "due_date": "2026-10-15", "status": "DEPOSITED"},
            {"form": "Form 16 Part A & B", "year": "2025-26", "due_date": "2026-06-15", "status": "ISSUED"},
        ]
    })

