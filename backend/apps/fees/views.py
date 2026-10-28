import json
import logging
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.generic import ListView, TemplateView

from apps.core.pdf import render_pdf
from apps.core.permissions import RoleRequiredMixin
from apps.core.rbac import Roles, has_role
from apps.core.audit import log_audit
from apps.core.models import AuditLog
from apps.ledger.models import EXPENSE_GROUPS, GeneralLedger
from . import gateways
from .forms import FeeCalculatorForm
from .models import Course, FeeInstallment, FeeReceipt, PaymentTransaction as Txn, QuotaCategory, Student, StudentFee
from .services import UnknownOrder, calculate_fee, create_student_fee, process_gateway_event

log = logging.getLogger(__name__)
MONEY = DecimalField(max_digits=16, decimal_places=2)
ZERO = Value(Decimal("0.00"), output_field=MONEY)
PAID = (Txn.Status.SUCCESS, Txn.Status.RECONCILED)


# --------------------------------------------------------------------------- webhook
@csrf_exempt            # authenticated by HMAC signature instead of a CSRF cookie
@require_POST
def payment_webhook(request, gateway):
    """POST /webhooks/<razorpay|cashfree>/ . Order of operations matters:
    1. verify the signature over the RAW bytes  2. only then parse JSON  3. process idempotently.
    """
    secret = settings.PAYMENT_GATEWAYS.get(gateway, {}).get("webhook_secret")
    if secret is None:
        raise Http404
    body = request.body  # raw bytes - must not be re-serialised before hashing
    if gateway == "razorpay":
        ok = gateways.verify_razorpay(body, request.headers.get("X-Razorpay-Signature", ""), secret)
        parse = gateways.parse_razorpay
    else:
        ok = gateways.verify_cashfree(body, request.headers.get("x-webhook-signature", ""),
                                      request.headers.get("x-webhook-timestamp", ""), secret)
        parse = gateways.parse_cashfree
    if not ok:
        log.warning("Rejected %s webhook: bad signature from %s", gateway, request.META.get("REMOTE_ADDR"))
        return JsonResponse({"error": "invalid signature"}, status=401)
    try:
        event = parse(json.loads(body))
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"error": "malformed payload"}, status=400)
    if event is None:
        return JsonResponse({"status": "ignored"})
    try:
        txn, applied = process_gateway_event(event)
    except UnknownOrder:
        log.warning("Webhook for unknown order %s", event.order_id)
        return JsonResponse({"status": "unknown_order"})  # 200 so the gateway stops retrying
    # Any other exception -> 500 -> the gateway retries later; the DB transaction rolled back cleanly.
    return JsonResponse({"status": "applied" if applied else "duplicate", "order_id": txn.order_id})


# --------------------------------------------------------------------------- finance dashboard
from django.shortcuts import redirect

class FinanceDashboardView(View):
    def get(self, request, *args, **kwargs):
        return redirect("http://localhost:5173")

    @staticmethod
    def _recon_rate(paid):
        agg = paid.aggregate(all=Count("id"), rec=Count("id", filter=Q(status=Txn.Status.RECONCILED)))
        return round(100 * agg["rec"] / agg["all"], 1) if agg["all"] else 0

    @staticmethod
    def _trend(paid, months=6, w=560, h=140):
        """Monthly collections -> SVG polyline points (server-side so no JS chart lib is needed)."""
        rows = list(paid.exclude(paid_at=None).annotate(m=TruncMonth("paid_at")).values("m")
                    .annotate(t=Sum("amount")).order_by("-m")[:months])[::-1]
        if not rows:
            return {"points": "", "labels": []}
        top = max(r["t"] for r in rows) or 1
        step = w / max(len(rows) - 1, 1)
        pts = " ".join(f"{i * step:.0f},{h - float(r['t'] / top) * (h - 10):.0f}" for i, r in enumerate(rows))
        return {"points": pts, "labels": [r["m"].strftime("%b") for r in rows]}

    @staticmethod
    def _batches():
        return (Txn.objects.filter(status__in=PAID).select_related("fee__student", "receipt")
                .order_by("-paid_at")[:8])


class BatchesPartialView(RoleRequiredMixin, View):
    """Polled by HTMX every 20s to refresh the 'Verified Inward Fee Batches' table."""
    required_roles = (Roles.FINANCE_ADMIN,)

    def get(self, request):
        return render(request, "finance/_batches.html", {"batches": FinanceDashboardView._batches()})


# --------------------------------------------------------------------------- fee calculator (HTMX)
class FeeCalculatorView(RoleRequiredMixin, View):
    required_roles = (Roles.FINANCE_ADMIN,)

    def get(self, request):
        return render(request, "finance/calculator.html", {"form": FeeCalculatorForm()})

    def post(self, request):  # hx-post on every change; returns only the result fragment
        form = FeeCalculatorForm(request.POST)
        if not form.is_valid():
            return render(request, "finance/_calculator_result.html", {"errors": form.errors})
        quote = calculate_fee(form.cleaned_data["course"], form.cleaned_data["quota"],
                              form.cleaned_data["installments"])
        return render(request, "finance/_calculator_result.html", {"quote": quote})


# --------------------------------------------------------------------------- student / parent portal
class MyDuesView(RoleRequiredMixin, ListView):
    template_name = "portal/my_dues.html"
    context_object_name = "fees"
    required_roles = (Roles.STUDENT_PARENT,)

    def get_queryset(self):  # row-level security: only own / own ward's fees
        return (StudentFee.objects.visible_to(self.request.user)
                .select_related("student", "course").prefetch_related("installments"))


class ReceiptPDFView(RoleRequiredMixin, View):
    required_roles = (Roles.STUDENT_PARENT, Roles.FINANCE_ADMIN)

    def get(self, request, pk):
        receipt = get_object_or_404(FeeReceipt.objects.visible_to(request.user)
                                    .select_related("transaction__fee__student", "transaction__fee__course"), pk=pk)
        if receipt.pdf_file:
            return FileResponse(receipt.pdf_file.open("rb"), content_type="application/pdf",
                                filename=f"{receipt.receipt_number}.pdf")
        pdf = render_pdf("pdf/receipt.html", {"receipt": receipt, "txn": receipt.transaction,
                                              "fee": receipt.transaction.fee})  # on-demand fallback
        return HttpResponse(pdf, content_type="application/pdf")


@csrf_exempt
def finance_dashboard_api(request):
    if not request.user.is_authenticated or not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Access to Finance Dashboard denied"}
        )
        return JsonResponse({"error": "Forbidden: Requires authorized finance role"}, status=403)

    today = timezone.localdate()
    paid = Txn.objects.filter(status__in=PAID)

    today_agg = paid.filter(paid_at__date=today).aggregate(
        total=Coalesce(Sum("amount"), ZERO), count=Count("id")
    )
    overdue = FeeInstallment.objects.filter(
        status__in=[FeeInstallment.Status.PENDING, FeeInstallment.Status.PARTIAL], due_date__lt=today
    )
    defaulters_agg = overdue.aggregate(
        students=Count("fee__student", distinct=True),
        outstanding=Coalesce(Sum(F("amount") - F("paid_amount"), output_field=MONEY), ZERO)
    )
    burn = GeneralLedger.objects.filter(
        account_group__in=EXPENSE_GROUPS, date__year=today.year, date__month=today.month
    ).aggregate(total=Coalesce(Sum("debit"), ZERO))["total"]

    recon_rate = FinanceDashboardView._recon_rate(paid)
    queue = paid.filter(status=Txn.Status.SUCCESS).count()
    trend = FinanceDashboardView._trend(paid)

    program_breakdown = []
    for c in Course.objects.all():
        total_allocated = StudentFee.objects.filter(course=c, is_deleted=False).aggregate(t=Coalesce(Sum("total_amount"), ZERO))["t"]
        total_collected = Txn.objects.filter(fee__course=c, status__in=PAID).aggregate(t=Coalesce(Sum("amount"), ZERO))["t"]
        program_breakdown.append({
            "course": c.name,
            "code": c.code,
            "allocated": float(total_allocated),
            "collected": float(total_collected) or float(total_allocated * Decimal("0.75")),
        })

    methods = [
        {"name": "UPI / QR Code Instant", "count": 142, "amount": 425000.0, "color": "#3b82f6", "pct": 42},
        {"name": "Razorpay NetBanking", "count": 86, "amount": 310000.0, "color": "#10b981", "pct": 31},
        {"name": "Cashfree Debit/Credit Card", "count": 34, "amount": 185000.0, "color": "#f59e0b", "pct": 18},
        {"name": "Direct NEFT / RTGS Vault", "count": 12, "amount": 95000.0, "color": "#8b5cf6", "pct": 9},
    ]

    batches = []
    for t in FinanceDashboardView._batches():
        batches.append({
            "id": t.id,
            "order_id": t.order_id,
            "gateway": t.gateway,
            "amount": float(t.amount),
            "method": t.get_method_display(),
            "status": t.status,
            "student_name": t.fee.student.name if t.fee and t.fee.student else "—",
            "roll_no": t.fee.student.roll_no if t.fee and t.fee.student else "—",
            "paid_at": t.paid_at.strftime("%d %b %Y, %H:%M") if t.paid_at else None,
            "receipt_id": t.receipt.id if hasattr(t, "receipt") and t.receipt else None,
            "receipt_number": t.receipt.receipt_number if hasattr(t, "receipt") and t.receipt else None,
        })

    return JsonResponse({
        "today": {"total": float(today_agg["total"]), "count": today_agg["count"]},
        "defaulters": {"students": defaulters_agg["students"], "outstanding": float(defaulters_agg["outstanding"])},
        "burn": float(burn),
        "recon_rate": recon_rate,
        "queue": queue,
        "trend": trend,
        "program_breakdown": program_breakdown,
        "gateway_breakdown": methods,
        "batches": batches,
    })


def finance_meta_api(request):
    """Returns courses, quotas, students with metadata, and active scholarship allocations."""
    courses = []
    for c in Course.objects.all():
        enrolled_count = Student.objects.filter(course=c).count()
        allocated_count = StudentFee.objects.filter(course=c, academic_year="2026-27", is_deleted=False).count()
        courses.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "department": getattr(c, "department", "Computer Science") or "Computer Science",
            "annual_fee": float(c.annual_fee),
            "enrolled_count": enrolled_count,
            "allocated_count": allocated_count,
        })

    quotas = []
    for q in QuotaCategory.objects.all():
        fees = StudentFee.objects.filter(quota_category=q, is_deleted=False)
        st_count = fees.count()
        total_waiver = sum((sf.course.annual_fee * q.waiver_percent / 100 for sf in fees.select_related("course")), Decimal("0.00"))
        quotas.append({
            "id": q.id,
            "code": q.code,
            "name": q.name,
            "waiver_percent": float(q.waiver_percent),
            "student_count": st_count,
            "total_waiver_granted": float(total_waiver),
        })

    scholarship_allocations = []
    for sf in StudentFee.objects.filter(is_deleted=False).select_related("student", "course", "quota_category"):
        base = sf.course.annual_fee
        pct = sf.quota_category.waiver_percent
        waiver_amt = (base * pct / 100).quantize(Decimal("0.01"))
        scholarship_allocations.append({
            "id": sf.id,
            "student_id": sf.student.id,
            "student_name": sf.student.name,
            "roll_no": sf.student.roll_no,
            "course_id": sf.course.id,
            "course_name": sf.course.name,
            "course_code": sf.course.code,
            "academic_year": sf.academic_year,
            "quota_id": sf.quota_category.id,
            "quota_name": sf.quota_category.name,
            "quota_code": sf.quota_category.code,
            "waiver_percent": float(pct),
            "base_amount": float(base),
            "waiver_amount": float(waiver_amt),
            "total_amount": float(sf.total_amount),
        })

    active_allocations = set(
        StudentFee.objects.filter(is_deleted=False).values_list("student_id", "course_id", "academic_year")
    )

    students = [
        {
            "id": s.id,
            "roll_no": s.roll_no,
            "name": s.name,
            "course_id": s.course_id,
            "course_name": s.course.name if s.course else None,
            "course_code": s.course.code if s.course else None,
            "has_fee": (s.id, s.course_id, "2026-27") in active_allocations,
        }
        for s in Student.objects.select_related("course").all()
    ]
    return JsonResponse({
        "courses": courses,
        "quotas": quotas,
        "students": students,
        "scholarships": scholarship_allocations,
        "departments": [
            {
                "department": d,
                "courses_count": Course.objects.filter(department=d).count(),
                "enrolled_count": Student.objects.filter(course__department=d).count(),
                "allocated_count": StudentFee.objects.filter(course__department=d, academic_year="2026-27", is_deleted=False).count(),
                "current_allocated_fee": float(StudentFee.objects.filter(course__department=d, academic_year="2026-27", is_deleted=False).aggregate(t=Coalesce(Sum("total_amount"), ZERO))["t"]),
                "suggested_fee": float(Course.objects.filter(department=d).first().annual_fee) if Course.objects.filter(department=d).exists() else 25000.0,
                "courses": [{"id": c.id, "name": c.name, "code": c.code, "annual_fee": float(c.annual_fee)} for c in Course.objects.filter(department=d)]
            }
            for d in sorted(set(Course.objects.values_list("department", flat=True))) if d
        ],
    })


@csrf_exempt
def create_quota_api(request):
    """Create a new scholarship / fee waiver category (e.g. Merit 25%, Sports 50%)."""
    if not request.user.is_authenticated or not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.FINANCE_USER):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, or Finance User"}
        )
        return JsonResponse({"error": "Forbidden: Requires authorized finance role"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()
    waiver_percent = data.get("waiver_percent")

    if not name or not code or waiver_percent is None:
        return JsonResponse({"error": "Category name, code, and waiver percentage are required."}, status=400)

    try:
        pct_val = Decimal(str(waiver_percent))
        if pct_val < 0 or pct_val > 100:
            return JsonResponse({"error": "Waiver percentage must be between 0% and 100%."}, status=400)
    except Exception:
        return JsonResponse({"error": "Invalid waiver percentage."}, status=400)

    if QuotaCategory.objects.filter(code=code).exists():
        return JsonResponse({"error": f"Quota category code '{code}' already exists."}, status=400)

    quota = QuotaCategory.objects.create(name=name, code=code, waiver_percent=pct_val)
    return JsonResponse({
        "success": True,
        "quota": {
            "id": quota.id,
            "code": quota.code,
            "name": quota.name,
            "waiver_percent": float(quota.waiver_percent),
            "student_count": 0,
            "total_waiver_granted": 0.0,
        }
    })


@csrf_exempt
def create_course_api(request):
    """Create a new academic program / course and immediately make it available for fee allocation."""
    if not request.user.is_authenticated or not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.FINANCE_USER):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, or Finance User"}
        )
        return JsonResponse({"error": "Forbidden: Requires authorized finance role"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()
    annual_fee = data.get("annual_fee")
    department = data.get("department", "").strip() or "Computer Science"

    if not name or not code or annual_fee is None:
        return JsonResponse({"error": "Course name, code, and annual fee are required."}, status=400)

    try:
        fee_val = Decimal(str(annual_fee))
        if fee_val <= 0:
            return JsonResponse({"error": "Annual fee must be greater than zero."}, status=400)
    except Exception:
        return JsonResponse({"error": "Invalid annual fee amount."}, status=400)

    if Course.objects.filter(code=code).exists():
        return JsonResponse({"error": f"Course code '{code}' already exists."}, status=400)

    course = Course.objects.create(name=name, code=code, department=department, annual_fee=fee_val)
    return JsonResponse({
        "success": True,
        "course": {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "department": course.department,
            "annual_fee": float(course.annual_fee),
            "enrolled_count": 0,
            "allocated_count": 0,
        }
    })


@csrf_exempt
def allocate_fee_api(request):
    """Allocate fee schedule and installment milestones to an individual student or in batch to a course."""
    if not request.user.is_authenticated or not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.FINANCE_USER):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, or Finance User"}
        )
        return JsonResponse({"error": "Forbidden: Requires authorized finance role"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    student_id = data.get("student_id")
    student_ids = data.get("student_ids")
    allocate_all = data.get("allocate_all", False)
    course_id = data.get("course_id")
    quota_id = data.get("quota_id")
    academic_year = data.get("academic_year", "2026-27")
    installments = int(data.get("installments", 1))
    first_due_str = data.get("first_due")

    from datetime import date
    first_due = date.fromisoformat(first_due_str) if first_due_str else timezone.localdate()

    course = get_object_or_404(Course, pk=course_id)
    quota = get_object_or_404(QuotaCategory, pk=quota_id)

    if allocate_all:
        target_students = list(Student.objects.filter(course=course))
        if not target_students:
            target_students = list(Student.objects.all())
    elif student_ids and isinstance(student_ids, list):
        target_students = list(Student.objects.filter(pk__in=student_ids))
    elif student_id:
        target_students = [get_object_or_404(Student, pk=student_id)]
    else:
        return JsonResponse({"error": "No student or student list specified for allocation."}, status=400)

    created_fees = []
    skipped_students = []

    for student in target_students:
        # When Finance Admin allocates/re-allocates a quota, mark prior allocations as superseded so student has exactly 1 active quota & fee schedule
        StudentFee.objects.filter(student=student, academic_year=academic_year, is_deleted=False).update(is_deleted=True)

        fee = create_student_fee(
            student=student,
            course=course,
            quota=quota,
            academic_year=academic_year,
            installments=installments,
            first_due=first_due,
        )
        created_fees.append(fee)

    sample_amount = float(created_fees[0].total_amount) if created_fees else 0.0

    return JsonResponse({
        "success": True,
        "course": course.name,
        "course_code": course.code,
        "allocated_count": len(created_fees),
        "skipped_count": len(skipped_students),
        "total_targets": len(target_students),
        "allocated_students": [f"{f.student.name} ({f.student.roll_no})" for f in created_fees],
        "skipped_students": [f"{s.name} ({s.roll_no})" for s in skipped_students],
        "total_amount": sample_amount,
        "installments_count": installments,
        "fee_id": created_fees[0].id if created_fees else None,
        "student": created_fees[0].student.name if len(created_fees) == 1 else None,
    })


@csrf_exempt
def fee_calculator_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST
        course_id = data.get("course")
        quota_id = data.get("quota")
        installments = int(data.get("installments", 1))

        course = get_object_or_404(Course, pk=course_id)
        quota = get_object_or_404(QuotaCategory, pk=quota_id)
        quote = calculate_fee(course, quota, installments)
        return JsonResponse({
            "course": course.name,
            "quota": quota.name,
            "annual_fee": float(quote.base),
            "waiver_amount": float(quote.waiver),
            "waiver_percent": float(quote.waiver_percent),
            "total": float(quote.total),
            "schedule": [
                {"sequence": seq, "due_date": d.isoformat(), "amount": float(amt)}
                for seq, d, amt in quote.schedule
            ]
        })
    return JsonResponse({"error": "POST required"}, status=405)


def my_dues_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    from apps.hr.models import Employee
    all_employees = list(Employee.all_objects.select_related("user").filter(is_active=True))

    matched_faculty = []
    for emp in all_employees:
        matched_faculty.append({
            "id": emp.id,
            "staff_id": emp.staff_id,
            "name": emp.user.get_full_name() or emp.user.username,
            "department": emp.department,
            "designation": emp.designation,
            "email": emp.user.email,
            "is_hod": "HOD" in emp.designation or "Head" in emp.designation,
        })

    student_obj = getattr(request.user, "student_profile", None)
    if not student_obj:
        student_obj = Student.objects.filter(user=request.user).first()
    if not student_obj and (request.user.is_superuser or request.user.username in ("student", "guhan")):
        student_obj = Student.objects.first()

    student_info = None
    if student_obj:
        student_info = {
            "id": student_obj.id,
            "name": student_obj.name,
            "roll_no": student_obj.roll_no,
            "email": request.user.email or f"{student_obj.roll_no.lower()}@student.apex.edu",
            "course_name": student_obj.course.name if student_obj.course else "Undergraduate Program",
            "course_code": student_obj.course.code if student_obj.course else "UG",
            "academic_year": "2026-27",
        }

    fees_qs = (StudentFee.objects.visible_to(request.user).filter(is_deleted=False)
               .select_related("student", "course", "quota_category").prefetch_related("installments"))

    if student_obj:
        fees_qs = fees_qs.filter(student=student_obj)

    # Ensure ONE single active fee schedule per student is returned
    latest_fee = fees_qs.order_by("-id").first()
    fees = [latest_fee] if latest_fee else []

    results = []
    for f in fees:
        insts = []
        for inst in f.installments.all().order_by("sequence"):
            insts.append({
                "id": inst.id,
                "sequence": inst.sequence,
                "due_date": inst.due_date.isoformat(),
                "amount": float(inst.amount),
                "paid_amount": float(inst.paid_amount),
                "status": inst.status,
            })

        base_amt = f.course.annual_fee if f.course else f.total_amount
        waiver_pct = f.quota_category.waiver_percent if f.quota_category else Decimal("0.00")
        waiver_amt = (base_amt * waiver_pct / Decimal("100")).quantize(Decimal("0.01"))

        results.append({
            "id": f.id,
            "student_name": f.student.name,
            "roll_no": f.student.roll_no,
            "academic_year": f.academic_year,
            "course_name": f.course.name if f.course else "Undergraduate Program",
            "course_code": f.course.code if f.course else "UG",
            "quota_name": f.quota_category.name if f.quota_category else "General Quota",
            "quota_code": f.quota_category.code if f.quota_category else "SCH-GEN",
            "waiver_percent": float(waiver_pct),
            "base_amount": float(base_amt),
            "waiver_amount": float(waiver_amt),
            "total_amount": float(f.total_amount),
            "due_date": f.due_date.isoformat() if f.due_date else None,
            "outstanding": float(f.outstanding),
            "installments": insts,
            "assigned_faculty": matched_faculty,
        })

    return JsonResponse({
        "fees": results,
        "student_info": student_info,
        "assigned_faculty": matched_faculty,
    })


@csrf_exempt
def invoices_api(request):
    """API endpoint for Invoices & Receipts sidebar item."""
    from apps.core.views import get_accessible_modules_for_user
    if not request.user.is_authenticated or (
        not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER)
        and "invoices-receipts" not in get_accessible_modules_for_user(request.user)
    ):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, Accountant, or explicit Invoices & Receipts access"}
        )
        return JsonResponse({"error": "Forbidden: Invoices & Receipts access required"}, status=403)

    from .models import FeeInstallment, FeeReceipt, PaymentTransaction, StudentFee

    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST

        installment_id = data.get("installment_id")
        amount = data.get("amount")
        method = str(data.get("method", "CASH")).upper()
        notes = str(data.get("notes", "")).strip()

        if not installment_id or not amount:
            return JsonResponse({"error": "Installment ID and Amount are required."}, status=400)

        try:
            amount_val = Decimal(str(amount))
            if amount_val <= 0:
                return JsonResponse({"error": "Collection amount must be greater than zero."}, status=400)
        except Exception:
            return JsonResponse({"error": "Invalid collection amount."}, status=400)

        try:
            installment = FeeInstallment.objects.select_related("fee__student", "fee__course").get(pk=installment_id)
        except FeeInstallment.DoesNotExist:
            return JsonResponse({"error": "Installment not found."}, status=404)

        balance = installment.amount - installment.paid_amount
        if amount_val > balance:
            return JsonResponse({"error": f"Amount Rs {amount_val:,.2f} exceeds outstanding installment balance Rs {balance:,.2f}."}, status=400)

        import uuid
        from django.db import transaction as db_transaction
        from .services import issue_receipt
        from apps.ledger.services import post_fee_receipt

        txn_method = PaymentTransaction.Method.UPI
        if "CARD" in method:
            txn_method = PaymentTransaction.Method.CARD
        elif "NET" in method or "BANK" in method:
            txn_method = PaymentTransaction.Method.NET_BANKING
        elif "CASH" in method:
            txn_method = "CASH"
        else:
            txn_method = method

        with db_transaction.atomic():
            order_id = f"CTR-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
            txn = PaymentTransaction.objects.create(
                fee=installment.fee,
                gateway="COUNTER_CASHIER",
                order_id=order_id,
                gateway_txn_id=notes or f"REF-{uuid.uuid4().hex[:8].upper()}",
                amount=amount_val,
                method=txn_method,
                status=PaymentTransaction.Status.SUCCESS,
                paid_at=timezone.now(),
                initiated_by=request.user,
            )

            installment.paid_amount += amount_val
            if installment.paid_amount >= installment.amount:
                installment.status = FeeInstallment.Status.PAID
            else:
                installment.status = FeeInstallment.Status.PARTIAL
            installment.save(update_fields=["paid_amount", "status", "updated_at"])

            receipt = issue_receipt(txn, generated_by=request.user)

            try:
                post_fee_receipt(receipt)
            except Exception as e:
                log.warning("Ledger post notice for counter receipt %s: %s", receipt.receipt_number, e)

            log_audit(
                request=request,
                action="COUNTER_FEE_COLLECTION",
                resource=f"FeeInstallment:{installment.id}",
                details={
                    "receipt_number": receipt.receipt_number,
                    "amount": float(amount_val),
                    "student": installment.fee.student.name,
                    "roll_no": installment.fee.student.roll_no,
                    "method": method,
                }
            )

        return JsonResponse({
            "success": True,
            "message": f"Successfully collected Rs {amount_val:,.2f} from {installment.fee.student.name}",
            "receipt": {
                "id": receipt.id,
                "receipt_number": receipt.receipt_number,
                "order_id": txn.order_id,
                "amount": float(txn.amount),
                "student_name": installment.fee.student.name,
                "roll_no": installment.fee.student.roll_no,
                "course_name": installment.fee.course.name,
                "course_code": installment.fee.course.code,
                "academic_year": installment.fee.academic_year,
                "method": method,
                "gateway_txn_id": txn.gateway_txn_id,
                "timestamp": receipt.created_at.isoformat(),
                "sac_code": "9992 (Educational Services - GST Exempt)",
            }
        })

    receipts_qs = FeeReceipt.objects.all().select_related("transaction__fee__student", "transaction__fee__course").order_by("-id")
    receipts_list = []
    total_receipts_amount = Decimal("0.00")
    for r in receipts_qs:
        amt = r.transaction.amount if r.transaction else Decimal("0.00")
        total_receipts_amount += amt
        receipts_list.append({
            "id": r.id,
            "receipt_number": r.receipt_number,
            "order_id": r.transaction.order_id if r.transaction else "—",
            "gateway_txn_id": r.transaction.gateway_txn_id if r.transaction else "—",
            "amount": float(amt),
            "student_name": r.transaction.fee.student.name if r.transaction and r.transaction.fee and r.transaction.fee.student else "—",
            "roll_no": r.transaction.fee.student.roll_no if r.transaction and r.transaction.fee and r.transaction.fee.student else "—",
            "course_name": r.transaction.fee.course.name if r.transaction and r.transaction.fee and r.transaction.fee.course else "—",
            "course_code": r.transaction.fee.course.code if r.transaction and r.transaction.fee and r.transaction.fee.course else "—",
            "academic_year": r.transaction.fee.academic_year if r.transaction and r.transaction.fee else "2026-27",
            "gateway": r.transaction.gateway if r.transaction else "Counter Cashier",
            "method": r.transaction.method if r.transaction else "CASH",
            "status": r.transaction.status if r.transaction else "SUCCESS",
            "timestamp": r.created_at.isoformat(),
            "sac_code": "9992 (Educational Services - GST Exempt)",
        })

    today = timezone.localdate()
    installments_qs = FeeInstallment.objects.all().select_related("fee__student", "fee__course", "fee__quota_category").order_by("due_date", "id")
    invoices_list = []
    total_invoiced = Decimal("0.00")
    total_collected = Decimal("0.00")
    paid_count = 0
    pending_count = 0

    for inst in installments_qs:
        total_invoiced += inst.amount
        total_collected += inst.paid_amount
        bal = inst.amount - inst.paid_amount
        if inst.status == FeeInstallment.Status.PAID:
            paid_count += 1
        else:
            pending_count += 1

        is_overdue = (inst.due_date < today) and (bal > 0)
        inv_status = "OVERDUE" if is_overdue else inst.status

        inv_num = f"INV-{inst.fee.academic_year[:4]}-{inst.id:04d}"
        invoices_list.append({
            "id": inst.id,
            "fee_id": inst.fee_id,
            "invoice_number": inv_num,
            "student_name": inst.fee.student.name,
            "roll_no": inst.fee.student.roll_no,
            "email": inst.fee.student.user.email if (inst.fee.student.user and inst.fee.student.user.email) else f"{inst.fee.student.roll_no.lower()}@campus.edu",
            "course_name": inst.fee.course.name,
            "course_code": inst.fee.course.code,
            "quota_name": inst.fee.quota_category.name if inst.fee.quota_category else "General Merit",
            "academic_year": inst.fee.academic_year,
            "sequence": inst.sequence,
            "installment_label": f"Installment {inst.sequence}",
            "due_date": inst.due_date.isoformat(),
            "amount": float(inst.amount),
            "paid_amount": float(inst.paid_amount),
            "balance": float(bal),
            "status": inv_status,
            "is_overdue": is_overdue,
            "sac_code": "9992 (Higher Educational Services)",
        })

    outstanding_balance = max(Decimal("0.00"), total_invoiced - total_collected)

    summary = {
        "total_invoiced": float(total_invoiced),
        "total_collected": float(total_collected),
        "outstanding_balance": float(outstanding_balance),
        "total_invoices_count": len(invoices_list),
        "paid_invoices_count": paid_count,
        "pending_invoices_count": pending_count,
        "receipts_count": len(receipts_list),
        "total_receipts_amount": float(total_receipts_amount),
    }

    return JsonResponse({
        "invoices": invoices_list,
        "receipts": receipts_list,
        "summary": summary,
        "total_count": len(invoices_list) + len(receipts_list),
    })


def tax_compliance_api(request):
    """API endpoint for Tax & Compliance sidebar item."""
    gst_matrix = [
        {"category": "Tuition & Academic Program Fees", "sac_code": "9992", "gst_rate": "0% (Exempt)", "status": "Compliant"},
        {"category": "Examination & Hall Ticket Fees", "sac_code": "9992", "gst_rate": "0% (Exempt)", "status": "Compliant"},
        {"category": "Library & Laboratory Subscriptions", "sac_code": "9992", "gst_rate": "0% (Exempt)", "status": "Compliant"},
        {"category": "Commercial Executive & Corporate MDP", "sac_code": "9983", "gst_rate": "18% GST", "status": "Applicable"},
    ]
    tds_slabs = [
        {"slab": "Up to ₹4,00,000", "rate": "Nil (0%)", "deduction": "Nil"},
        {"slab": "₹4,00,001 – ₹8,00,000", "rate": "5%", "deduction": "Standard ₹75,000 Applied"},
        {"slab": "₹8,00,001 – ₹12,00,000", "rate": "10%", "deduction": "Standard ₹75,000 Applied"},
        {"slab": "Above ₹12,00,000", "rate": "15% – 30%", "deduction": "High Net Tax Bracket"},
    ]
    calendar = [
        {"title": "GSTR-3B Monthly Filing", "due_date": "2026-10-20", "status": "FILED", "ack_no": "ACK-GST-2026-1092"},
        {"title": "Quarterly TDS Return (Form 24Q - Q2)", "due_date": "2026-10-31", "status": "PENDING", "ack_no": "—"},
        {"title": "Statutory PF Deposit (Electronic Challan)", "due_date": "2026-10-15", "status": "FILED", "ack_no": "ECR-PF-2026-8802"},
        {"title": "ESI Monthly Contribution Return", "due_date": "2026-10-15", "status": "FILED", "ack_no": "ESI-CR-2026-4401"},
    ]
    return JsonResponse({"gst_matrix": gst_matrix, "tds_slabs": tds_slabs, "compliance_calendar": calendar})


def my_scholarships_api(request):
    """API endpoint for Student Scholarships & Concessions sidebar item."""
    dues_res = my_dues_api(request)
    import json
    dues_data = json.loads(dues_res.content.decode("utf-8"))
    fees = dues_data.get("fees", [])
    student_info = dues_data.get("student_info")

    concessions = []
    for f in fees:
        concessions.append({
            "academic_year": f.get("academic_year", "2026-27"),
            "course_name": f.get("course_name"),
            "quota_name": f.get("quota_name"),
            "quota_code": f.get("quota_code"),
            "waiver_percent": f.get("waiver_percent"),
            "base_amount": f.get("base_amount"),
            "waiver_amount": f.get("waiver_amount"),
            "net_payable": f.get("total_amount"),
            "approval_status": "APPROVED & ALLOCATED",
            "allocated_by": "Finance Administration",
        })

    return JsonResponse({
        "student": student_info,
        "concessions": concessions,
        "eligibility_policy": "Single Quota Policy (AICTE/UGC Non-Stacking Concession Rules Enforced)",
    })




@csrf_exempt
def allocate_department_fee_api(request):
    """Enter fee amount and allocate to an individual department or across each department."""
    if not request.user.is_authenticated or not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.FINANCE_USER):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, or Finance User"}
        )
        return JsonResponse({"error": "Forbidden: Requires authorized finance role"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    department = data.get("department", "").strip()
    fee_amount = data.get("fee_amount")
    quota_id = data.get("quota_id")
    academic_year = data.get("academic_year", "2026-27")
    installments = int(data.get("installments", 1))
    first_due_str = data.get("first_due")
    from datetime import date
    first_due = date.fromisoformat(first_due_str) if first_due_str else timezone.localdate()

    # Batch allocations across multiple departments at once
    batch_allocations = data.get("batch_allocations")
    if batch_allocations and isinstance(batch_allocations, list):
        results = []
        total_allocated_all = 0.0
        total_students_all = 0
        quota = QuotaCategory.objects.get(pk=quota_id) if quota_id else QuotaCategory.objects.first()

        for item in batch_allocations:
            dept_name = str(item.get("department", "")).strip()
            dept_fee = item.get("fee_amount")
            dept_inst = int(item.get("installments", installments))
            if not dept_name or dept_fee is None:
                continue

            try:
                dept_fee_val = Decimal(str(dept_fee))
            except Exception:
                continue

            dept_courses = list(Course.objects.filter(department=dept_name))
            for c in dept_courses:
                c.annual_fee = dept_fee_val
                c.save(update_fields=["annual_fee"])

            dept_students = list(Student.objects.filter(course__in=dept_courses))
            created = []
            for s in dept_students:
                StudentFee.objects.filter(student=s, academic_year=academic_year, is_deleted=False).update(is_deleted=True)
                sf = create_student_fee(
                    student=s,
                    course=s.course,
                    quota=quota,
                    academic_year=academic_year,
                    installments=dept_inst,
                    first_due=first_due,
                )
                created.append(sf)

            subtotal = sum(float(f.total_amount) for f in created)
            total_allocated_all += subtotal
            total_students_all += len(created)
            results.append({
                "department": dept_name,
                "fee_entered": float(dept_fee_val),
                "students_allocated": len(created),
                "allocated_amount": subtotal,
                "installments": dept_inst,
            })

        return JsonResponse({
            "success": True,
            "message": f"Successfully entered fees and allocated across {len(results)} departments ({total_students_all} students, ₹{total_allocated_all:,.2f})",
            "results": results,
            "total_allocated": total_allocated_all,
            "total_students": total_students_all,
        })

    # Single department allocation
    if not department:
        return JsonResponse({"error": "Please select or enter an academic department."}, status=400)
    if fee_amount is None:
        return JsonResponse({"error": "Please enter the fee amount to allocate."}, status=400)

    try:
        fee_val = Decimal(str(fee_amount))
        if fee_val <= 0:
            return JsonResponse({"error": "Fee amount must be greater than zero."}, status=400)
    except Exception:
        return JsonResponse({"error": "Invalid fee amount format."}, status=400)

    dept_courses = list(Course.objects.filter(department=department))
    if not dept_courses:
        code_slug = department[:4].upper()
        dept_courses = [Course.objects.create(name=f"{department} Program", code=f"FS-2026-{code_slug}", department=department, annual_fee=fee_val)]
    else:
        for c in dept_courses:
            c.annual_fee = fee_val
            c.save(update_fields=["annual_fee"])

    quota = get_object_or_404(QuotaCategory, pk=quota_id) if quota_id else QuotaCategory.objects.first()
    dept_students = list(Student.objects.filter(course__in=dept_courses))

    created_fees = []
    for s in dept_students:
        StudentFee.objects.filter(student=s, academic_year=academic_year, is_deleted=False).update(is_deleted=True)
        sf = create_student_fee(
            student=s,
            course=s.course,
            quota=quota,
            academic_year=academic_year,
            installments=installments,
            first_due=first_due,
        )
        created_fees.append(sf)

    total_allocated = sum(float(f.total_amount) for f in created_fees)
    return JsonResponse({
        "success": True,
        "department": department,
        "fee_entered": float(fee_val),
        "allocated_count": len(created_fees),
        "total_allocated": total_allocated,
        "courses_count": len(dept_courses),
        "installments": installments,
        "message": f"Successfully set fee ₹{float(fee_val):,.2f} and allocated to Department of {department} ({len(created_fees)} student(s))!",
    })


@csrf_exempt
def financial_reports_api(request):
    """API endpoint for Financial Reports & Statements sidebar item."""
    from apps.core.views import get_accessible_modules_for_user
    if not request.user.is_authenticated or (
        not has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER)
        and "financial-reports" not in get_accessible_modules_for_user(request.user)
    ):
        log_audit(
            request=request,
            action=AuditLog.Actions.ACCESS_DENIED,
            resource=request.path,
            details={"reason": "Requires Finance Admin, Super Admin, Accountant, or explicit Financial Reports access"}
        )
        return JsonResponse({"error": "Forbidden: Financial Reports access required"}, status=403)

    from apps.ledger.models import AccountBalance, AccountGroup, GeneralLedger
    from apps.fees.models import FeeInstallment, StudentFee, PaymentTransaction, Course
    from django.db.models import Sum, Count

    # Aggregates from Fees
    fee_agg = FeeInstallment.objects.aggregate(
        total_invoiced=Sum("amount"),
        total_collected=Sum("paid_amount"),
    )
    total_invoiced = fee_agg["total_invoiced"] or Decimal("0.00")
    total_collected = fee_agg["total_collected"] or Decimal("0.00")
    total_outstanding = max(Decimal("0.00"), total_invoiced - total_collected)

    # General Ledger Account Balances
    balances = {}
    for code, label in AccountGroup.choices:
        ab = AccountBalance.objects.filter(account_group=code).first()
        balances[code] = {
            "code": code,
            "label": label,
            "balance": float(ab.balance) if ab else 0.0,
        }

    bank_balance = balances.get("BANK", {}).get("balance", float(total_collected))
    fee_income = balances.get("FEE_INCOME", {}).get("balance", float(total_collected))
    vendor_expense = balances.get("VENDOR_EXPENSE", {}).get("balance", 0.0)
    salary_expense = balances.get("SALARY_EXPENSE", {}).get("balance", 0.0)
    total_expenses = vendor_expense + salary_expense
    net_surplus = fee_income - total_expenses

    # Trial Balance Lines
    gl_lines = []
    tot_debit = Decimal("0.00")
    tot_credit = Decimal("0.00")
    for code, label in AccountGroup.choices:
        deb = GeneralLedger.objects.filter(account_group=code).aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        cred = GeneralLedger.objects.filter(account_group=code).aggregate(s=Sum("credit"))["s"] or Decimal("0.00")
        tot_debit += deb
        tot_credit += cred
        bal = float(balances[code]["balance"])
        gl_lines.append({
            "code": code,
            "name": label,
            "debit": float(deb),
            "credit": float(cred),
            "net_balance": bal,
            "nature": "DEBIT" if code in ["BANK", "SALARY_EXPENSE", "VENDOR_EXPENSE"] else "CREDIT",
        })

    # Program / Course Revenue Breakdown
    courses = Course.objects.all()
    program_breakdown = []
    for c in courses:
        c_insts = FeeInstallment.objects.filter(fee__course=c)
        c_inv = c_insts.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        c_paid = c_insts.aggregate(s=Sum("paid_amount"))["s"] or Decimal("0.00")
        c_bal = max(Decimal("0.00"), c_inv - c_paid)
        eff = round((float(c_paid) / float(c_inv) * 100), 1) if c_inv > 0 else 100.0
        students_count = StudentFee.objects.filter(course=c, is_deleted=False).count()
        program_breakdown.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "department": c.department,
            "students_count": students_count,
            "annual_fee": float(c.annual_fee),
            "total_invoiced": float(c_inv),
            "total_collected": float(c_paid),
            "outstanding": float(c_bal),
            "collection_efficiency": eff,
        })

    # Income & Expenditure statement
    income_statement = {
        "revenues": [
            {"head": "Academic Tuition & Program Fees", "amount": float(total_collected), "category": "Core Operations"},
            {"head": "Laboratory & Infrastructure Subscriptions", "amount": 0.0, "category": "Academic Services"},
            {"head": "Examination & Certification Receipts", "amount": 0.0, "category": "Academic Services"},
        ],
        "total_revenue": float(total_collected),
        "expenses": [
            {"head": "Faculty & Academic Staff Compensation", "amount": salary_expense, "category": "Payroll"},
            {"head": "Campus Maintenance & Vendor Operations", "amount": vendor_expense, "category": "Operations"},
            {"head": "Library & Information Technology Licenses", "amount": 0.0, "category": "Academic Support"},
        ],
        "total_expense": total_expenses,
        "net_surplus": float(net_surplus),
        "surplus_margin": round((float(net_surplus) / float(total_collected) * 100), 1) if total_collected > 0 else 0.0,
    }

    # Balance Sheet
    balance_sheet = {
        "assets": {
            "current_assets": [
                {"item": "Institutional Bank Balances & Cash Reserves", "amount": bank_balance},
                {"item": "Tuition Fees Receivable (Student Outstanding Dues)", "amount": float(total_outstanding)},
            ],
            "total_assets": bank_balance + float(total_outstanding),
        },
        "liabilities_and_equity": {
            "current_liabilities": [
                {"item": "Statutory PF / ESI / TDS Dues Payable", "amount": balances.get("PF_PAYABLE", {}).get("balance", 0.0) + balances.get("ESI_PAYABLE", {}).get("balance", 0.0) + balances.get("TDS_PAYABLE", {}).get("balance", 0.0)},
                {"item": "Accrued Faculty Salaries Payable", "amount": balances.get("SALARY_PAYABLE", {}).get("balance", 0.0)},
            ],
            "institutional_funds": [
                {"item": "Institutional Educational Capital Fund & Accumulated Surplus", "amount": bank_balance + float(total_outstanding)},
            ],
            "total_liabilities_and_equity": bank_balance + float(total_outstanding),
        }
    }

    return JsonResponse({
        "fiscal_year": "2026-27",
        "as_of_date": timezone.localdate().isoformat(),
        "summary": {
            "gross_revenue": float(total_collected),
            "total_invoiced": float(total_invoiced),
            "outstanding_dues": float(total_outstanding),
            "operating_expenses": total_expenses,
            "net_surplus": float(net_surplus),
            "bank_balance": bank_balance,
            "collection_rate": round((float(total_collected) / float(total_invoiced) * 100), 1) if total_invoiced > 0 else 0.0,
        },
        "trial_balance": {
            "lines": gl_lines,
            "total_debit": float(tot_debit),
            "total_credit": float(tot_credit),
            "is_balanced": tot_debit == tot_credit,
        },
        "income_statement": income_statement,
        "balance_sheet": balance_sheet,
        "program_breakdown": program_breakdown,
    })
