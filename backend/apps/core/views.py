from django.shortcuts import redirect, render

PROBLEMS = [("Manual reconciliation", "Gateway settlements matched to fee records by hand."),
            ("Spreadsheet payroll", "Loss-of-pay and statutory deductions calculated off-system."),
            ("Disconnected leave", "Approvals in email, attendance somewhere else."),
            ("Audit scramble", "No single trail from a payment to the ledger.")]
FEATURES = [("Fee management", "Course and quota-based fees, waivers, instalments, late-fee rules."),
            ("Verified payments", "Signed gateway webhooks, duplicate-safe, auto-receipts."),
            ("General ledger", "Balanced double-entry vouchers posted automatically."),
            ("Attendance & leave", "Daily attendance and approval workflow in one place."),
            ("Payroll engine", "Leave-linked LOP with PF, ESI and TDS in one atomic run."),
            ("PDF receipts & payslips", "Generated in the background, downloadable on demand.")]
HR = ["Employee records", "Attendance", "Leave approvals", "Payslips"]
PIPELINE = ["Attendance", "Approved leave", "LOP days", "PF · ESI · TDS", "Net pay"]
ROLES = [("Super Admin", "Global read and write."), ("Finance Admin", "Fees, transactions, ledger, analytics."),
         ("HR Admin", "Employees, attendance, leave, payroll."), ("Employee", "Own attendance, leave and payslips."),
         ("Student / Parent", "Own fee dues and receipts.")]
FAQ = [("Can a payment be credited twice?", "No. Each webhook is signature-verified and the transaction row is locked, so duplicates do nothing."),
       ("How is loss of pay decided?", "Unapproved absences and unpaid leave on working days reduce pay; approved paid leave does not."),
       ("Can ledger entries be edited?", "No. Entries are immutable; corrections are posted as reversing vouchers."),
       ("Who can see salary data?", "HR Admins, and each employee only for their own payslips.")]
FOOTER = {"Product": ["Fund Accounting", "Faculty Payroll", "Grants & Sponsored Research", "Budget Forecasting", "Procurement Engine"],
          "Platform": ["Institutional Architecture", "Audit & Compliance Vault", "ERP Integrations", "API Documentation", "Security Whitepapers"],
          "Company": ["About Us", "Academic Advisory Board", "Case Studies", "Leadership", "Contact Institutional Sales"],
          "Legal": ["Privacy Policy", "FERPA & Title IV Compliance", "SOC 2 Type II Certification", "Terms of Service", "Security Vulnerability Program"]}


def landing(request):
    """Backend status page pointing to API and React Frontend."""
    if request.user.is_authenticated:
        return redirect("http://localhost:5173")
    from django.http import HttpResponse
    return HttpResponse("""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Apex University ERP — Backend API</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 60px 20px; display: flex; justify-content: center; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; max-width: 580px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { color: #0037b0; font-size: 22px; margin: 0 0 8px 0; }
    p { font-size: 13px; color: #475569; line-height: 1.6; }
    .btn { display: inline-flex; align-items: center; gap: 8px; background: #0037b0; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 700; margin-top: 12px; }
    .btn:hover { background: #002c8c; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
    ul { font-size: 13px; color: #475569; padding-left: 20px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Apex University ERP</h1>
    <p><strong>Django REST API Backend Service</strong> is running on port 8000.</p>
    <p>To use the ERP system, open the React Frontend application:</p>
    <a href="http://localhost:5173" class="btn">Launch React Frontend (localhost:5173) &rarr;</a>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p><strong>Available REST API Endpoints:</strong></p>
    <ul>
      <li><code>/api/auth/csrf/</code> — CSRF token endpoint</li>
      <li><code>/api/auth/login/</code> — User authentication</li>
      <li><code>/api/auth/me/</code> — Active session profile & permissions</li>
      <li><code>/api/finance/dashboard/</code> — Finance ledger aggregates & batches</li>
      <li><code>/api/finance/calculator/</code> — Fee calculation & schedules</li>
      <li><code>/api/portal/dues/</code> — Student fee dues</li>
      <li><code>/api/portal/payslips/</code> — Faculty salary payslips</li>
      <li><code>/admin/</code> — Django Administration</li>
    </ul>
  </div>
</body>
</html>""", content_type="text/html")


import json
from django.db import transaction
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from apps.core.rbac import user_roles, Roles, has_role, primary_role
from apps.core.models import RoleModuleAccess, AuditLog, UserProfile, RolePermission
from apps.core.audit import log_audit
from apps.core.permission_service import (
    MODULE_DEFINITIONS,
    DEFAULT_ROLE_PERMISSIONS,
    get_user_permissions,
    seed_default_permissions
)


SYSTEM_MODULES = [
    {
        "category": "Fee & Financial Management",
        "modules": [
            {"id": "finance-dashboard", "name": "Financial Overview", "description": "Cashflow, collections & revenue summaries"},
            {"id": "fee-structures", "name": "Fee Structures & Calculator", "description": "Tuition slabs, course fees & allocation"},
            {"id": "invoices-receipts", "name": "Invoices & Receipts", "description": "Official student invoices and PDF receipts"},
            {"id": "scholarships", "name": "Scholarships & Waivers", "description": "Merit concessions, quota waivers & grants"},
            {"id": "general-ledger", "name": "General & Journal Ledger", "description": "Double-entry vouchers & account books"},
            {"id": "financial-reports", "name": "Financial Reports & Statements", "description": "P&L summaries, balance sheets & audit books"},
        ]
    },
    {
        "category": "Administration & Security",
        "modules": [
            {"id": "role-permissions", "name": "Role & Permissions", "description": "Granular action matrix and security permissions"},
            {"id": "audit-logs", "name": "Audit Logs", "description": "Immutable security logs and transactional activity"},
        ]
    },
    {
        "category": "HR & Payroll Management",
        "modules": [
            {"id": "employee-lifecycle", "name": "Employee Lifecycle", "description": "Staff directory, confirmation & designations"},
            {"id": "attendance-leaves", "name": "Attendance & Leaves", "description": "Staff clock-in records & leave approvals"},
            {"id": "holidays", "name": "Declared Holidays", "description": "Academic & institutional declared holidays"},
            {"id": "performance-appraisal", "name": "Performance Appraisals", "description": "Annual appraisal reviews & salary increments"},
        ]
    },
    {
        "category": "Student Management & Services",
        "modules": [
            {"id": "student-portal", "name": "My Dues & Receipts", "description": "Personal fee balance & payment receipts"},
            {"id": "student-scholarships", "name": "Scholarships & Concessions", "description": "Approved student scholarships & fee waivers"},
            {"id": "academic-calendar", "name": "Academic Holiday Calendar", "description": "Semester schedule & university holidays"},
        ]
    },
    {
        "category": "Employee Self-Service",
        "modules": [
            {"id": "employee-details", "name": "Employee Details", "description": "Staff identification, profile & salary record"},
            {"id": "employee-leaves", "name": "Apply Leave / My Attendance", "description": "Clock-in punch logs & leave applications"},
            {"id": "employee-appraisal", "name": "My Appraisals", "description": "Evaluation ratings & increment letters"},
        ]
    },
]

ALL_MODULE_IDS = [m["id"] for cat in SYSTEM_MODULES for m in cat["modules"]]

DEFAULT_ROLE_ACCESS = {
    Roles.SUPER_ADMIN: ALL_MODULE_IDS,
    Roles.FINANCE_ADMIN: [
        "finance-dashboard", "fee-structures", "invoices-receipts", "scholarships",
        "general-ledger", "financial-reports"
    ],
    Roles.FINANCE_USER: [
        "finance-dashboard", "fee-structures", "invoices-receipts"
    ],
    Roles.ACCOUNTANT: [
        "finance-dashboard", "fee-structures", "invoices-receipts", "scholarships",
        "general-ledger", "financial-reports"
    ],
    Roles.FEE_MANAGER: [
        "finance-dashboard", "fee-structures", "invoices-receipts", "scholarships", "financial-reports"
    ],
    Roles.HR_ADMIN: [
        "employee-lifecycle", "attendance-leaves", "holidays", "performance-appraisal"
    ],
    Roles.STUDENT_PARENT: [
        "student-portal", "student-scholarships", "academic-calendar"
    ],
    Roles.EMPLOYEE: [
        "employee-details", "employee-leaves", "employee-appraisal"
    ],
    Roles.VIEWER: [
        "finance-dashboard", "fee-structures", "invoices-receipts", "scholarships", "financial-reports"
    ],
}


def get_accessible_modules_for_user(user) -> list:
    if not getattr(user, "is_authenticated", False):
        return []
    if user.is_superuser:
        return ALL_MODULE_IDS

    roles = list(user_roles(user))
    if Roles.SUPER_ADMIN in roles:
        return ALL_MODULE_IDS

    # Check if user has explicit custom module assignment from Finance Admin
    profile = getattr(user, "erp_profile", None)
    if profile and profile.has_custom_permissions and isinstance(profile.custom_modules, list):
        return [mid for mid in ALL_MODULE_IDS if mid in profile.custom_modules]

    accessible = set()
    for role_name in roles:
        defaults = set(DEFAULT_ROLE_ACCESS.get(role_name, []))
        overrides = {
            rma.module_id: rma.is_granted
            for rma in RoleModuleAccess.objects.filter(role=role_name)
        }
        rp_views = {
            rp.module_id: rp.can_view
            for rp in RolePermission.objects.filter(role=role_name)
        }
        for mid in ALL_MODULE_IDS:
            if mid in overrides:
                if overrides[mid]:
                    accessible.add(mid)
            elif mid in rp_views:
                if rp_views[mid]:
                    accessible.add(mid)
            else:
                if mid in defaults:
                    accessible.add(mid)
    return [mid for mid in ALL_MODULE_IDS if mid in accessible]


def csrf_api(request):
    """Returns the CSRF token and ensures the csrftoken cookie is set."""
    token = get_token(request)
    return JsonResponse({"csrfToken": token})


@csrf_exempt
def login_api(request):
    """Authenticate and create user session for React frontend."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    demo_role = data.get("demo_role")

    User = get_user_model()
    user = None

    if demo_role and not password:
        from django.contrib.auth.models import Group
        if demo_role == Roles.SUPER_ADMIN:
            user = User.objects.filter(is_superuser=True).first()
        elif demo_role in (Roles.STUDENT_PARENT, "Student/Parent", "Student / Parent"):
            user = User.objects.filter(student_profile__isnull=False, is_superuser=False).first()
            if not user:
                user = User.objects.filter(groups__name=Roles.STUDENT_PARENT, is_superuser=False).first()
            if not user:
                user = User.objects.filter(username__in=["student1", "student", "guhan"]).first()
            if not user:
                # Create dedicated student account
                from apps.fees.models import Student, Course
                user = User.objects.create_user(username="student1", email="student1@student.apex.edu", password="password123")
                st_group, _ = Group.objects.get_or_create(name=Roles.STUDENT_PARENT)
                user.groups.add(st_group)
                course = Course.objects.first()
                if not course:
                    course = Course.objects.create(code="CS-BSC", name="BSc Computer Science", annual_fee=85000)
                Student.objects.get_or_create(user=user, defaults={"roll_no": "2026-BSC-003", "name": "Guhan A", "course": course})
        elif demo_role in (Roles.EMPLOYEE, "Employee"):
            user = User.objects.filter(employee_profile__isnull=False, is_superuser=False).first()
            if not user:
                user = User.objects.filter(groups__name=Roles.EMPLOYEE, is_superuser=False).first()
            if not user:
                user = User.objects.filter(username__in=["faculty1", "employee", "rajesh"]).first()
        elif demo_role in (Roles.FINANCE_ADMIN, "Finance Admin"):
            user = User.objects.filter(groups__name=Roles.FINANCE_ADMIN).first()
            if not user:
                user = User.objects.filter(is_staff=True).first()
        elif demo_role in (Roles.FINANCE_USER, "Finance User"):
            user = User.objects.filter(groups__name=Roles.FINANCE_USER).first()
            if not user:
                user = User.objects.create_user(username="financeuser", email="financeuser@apex.edu", password="password123", first_name="Karthik", last_name="Menon")
                grp, _ = Group.objects.get_or_create(name=Roles.FINANCE_USER)
                user.groups.add(grp)
                UserProfile.objects.get_or_create(user=user, defaults={"department": "Finance & Accounts", "staff_id": "FIN002"})
        elif demo_role in (Roles.ACCOUNTANT, "Accountant"):
            user = User.objects.filter(groups__name=Roles.ACCOUNTANT).first()
            if not user:
                user = User.objects.create_user(username="accountant", email="accountant@apex.edu", password="password123", first_name="Ravi", last_name="Shankar")
                grp, _ = Group.objects.get_or_create(name=Roles.ACCOUNTANT)
                user.groups.add(grp)
                UserProfile.objects.get_or_create(user=user, defaults={"department": "Accounts & Ledger", "staff_id": "ACC001"})
        elif demo_role in (Roles.FEE_MANAGER, "Fee Manager"):
            user = User.objects.filter(groups__name=Roles.FEE_MANAGER).first()
            if not user:
                user = User.objects.create_user(username="feemanager", email="feemanager@apex.edu", password="password123", first_name="Sanjay", last_name="Verma")
                grp, _ = Group.objects.get_or_create(name=Roles.FEE_MANAGER)
                user.groups.add(grp)
                UserProfile.objects.get_or_create(user=user, defaults={"department": "Fee Collections & Waivers", "staff_id": "FEE001"})
        elif demo_role in (Roles.VIEWER, "Viewer"):
            user = User.objects.filter(groups__name=Roles.VIEWER).first()
            if not user:
                user = User.objects.create_user(username="viewer", email="viewer@apex.edu", password="password123", first_name="Ananya", last_name="Iyer")
                grp, _ = Group.objects.get_or_create(name=Roles.VIEWER)
                user.groups.add(grp)
                UserProfile.objects.get_or_create(user=user, defaults={"department": "Institutional Oversight", "staff_id": "VIW001"})
        elif demo_role in (Roles.HR_ADMIN, "HR Admin"):
            user = User.objects.filter(groups__name=Roles.HR_ADMIN).first()

        if not user:
            user = User.objects.first()

    else:
        if not username:
            return JsonResponse({"error": "Username or email is required"}, status=400)

        # Allow login using email address as well as username
        if "@" in username:
            u_obj = User.objects.filter(email__iexact=username).first()
            if u_obj:
                username = u_obj.username

        user = authenticate(request, username=username, password=password)

    if not user:
        log_audit(
            request=request,
            action=AuditLog.Actions.LOGIN_FAILED,
            resource="Auth",
            details={"attempted_username": username or demo_role, "reason": "Invalid credentials"}
        )
        return JsonResponse({"error": "Invalid username/email or password"}, status=401)

    if not user.is_active:
        log_audit(
            request=request,
            action=AuditLog.Actions.LOGIN_FAILED,
            resource="Auth",
            details={"attempted_username": user.username, "reason": "Account is inactive / deactivated"}
        )
        return JsonResponse({"error": "This account has been deactivated. Please contact your system administrator."}, status=403)

    login(request, user)
    log_audit(
        request=request,
        action=AuditLog.Actions.USER_LOGIN,
        resource="Auth",
        actor_override=user,
        details={"role": primary_role(user), "login_type": "credentials" if password else "demo_role"}
    )

    roles = list(user_roles(user))
    profile_data = {}
    if hasattr(user, "employee_profile"):
        emp = user.employee_profile
        profile_data = {
            "type": "employee",
            "staff_id": emp.staff_id,
            "department": emp.department,
            "designation": emp.designation,
        }
    elif hasattr(user, "erp_profile"):
        prof = user.erp_profile
        profile_data = {
            "type": "erp_user",
            "staff_id": prof.staff_id,
            "department": prof.department,
            "phone": prof.phone,
        }
    elif hasattr(user, "student_profile"):
        stu = user.student_profile
        profile_data = {
            "type": "student",
            "roll_no": stu.roll_no,
            "name": stu.name,
        }

    return JsonResponse({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": primary_role(user),
            "roles": roles,
            "is_superuser": user.is_superuser,
            "profile": profile_data,
            "accessible_modules": get_accessible_modules_for_user(user),
            "permissions": get_user_permissions(user),
        }
    })


@csrf_exempt
def register_api(request):
    """Registers a new account and establishes active session."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    full_name = str(data.get("full_name", "")).strip()
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    role_choice = str(data.get("role", Roles.EMPLOYEE)).strip()

    if not username and email:
        username = email.split("@")[0].replace(".", "_")

    if not username:
        return JsonResponse({"error": "Username or email is required."}, status=400)
    if not password:
        return JsonResponse({"error": "Password is required."}, status=400)
    if len(password) < 4:
        return JsonResponse({"error": "Password must be at least 4 characters."}, status=400)

    User = get_user_model()
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"error": "An account with this username already exists. Please choose a different one or sign in."}, status=400)
    if email and User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "An account with this email already exists. Please sign in instead."}, status=400)

    parts = full_name.split(maxsplit=1)
    first_name = parts[0] if parts else username
    last_name = parts[1] if len(parts) > 1 else ""

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )

    from django.contrib.auth.models import Group
    allowed_roles = list(Roles.ALL)
    target_role = role_choice if role_choice in allowed_roles else Roles.EMPLOYEE

    # Super Admin: grant Django superuser + staff status
    if target_role == Roles.SUPER_ADMIN:
        user.is_superuser = True
        user.is_staff = True
        user.save(update_fields=["is_superuser", "is_staff"])

    grp, _ = Group.objects.get_or_create(name=target_role)
    user.groups.add(grp)

    if target_role == Roles.EMPLOYEE:
        from apps.hr.models import Employee
        from django.utils import timezone
        prefix = "FAC"
        num = Employee.all_objects.filter(staff_id__startswith=prefix).count() + 1
        staff_id = f"{prefix}{num:03d}"
        Employee.objects.create(
            user=user,
            staff_id=staff_id,
            department="Computer Science",
            designation="Lecturer",
            employee_type=Employee.Type.TEACHING,
            lifecycle_status=Employee.LifecycleStatus.CONFIRMED,
            joining_date=timezone.localdate(),
            basic_salary=35000,
            hra=10000,
            allowances=3000,
        )
    elif target_role == Roles.STUDENT_PARENT:
        from apps.fees.models import Student, Course
        course = Course.objects.first()
        if not course:
            course = Course.objects.create(code="CS-BSC", name="BSc Computer Science", annual_fee=85000)
        num = Student.objects.count() + 1
        Student.objects.create(
            user=user,
            roll_no=f"2026-STU-{num:03d}",
            name=full_name or username,
            course=course
        )

    login(request, user)
    roles = list(user_roles(user))

    return JsonResponse({
        "success": True,
        "message": f"Welcome, {user.get_full_name() or user.username}! Your account has been created.",
        "user": {
            "id": user.id,
            "username": user.username,
            "roles": roles,
            "is_superuser": user.is_superuser,
            "email": user.email,
            "name": user.get_full_name() or user.username,
        }
    })


@csrf_exempt
def forgot_password_api(request):
    """Verifies account and resets password."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    identifier = str(data.get("identifier", "")).strip()
    new_password = str(data.get("new_password", "")).strip()

    if not identifier:
        return JsonResponse({"error": "Please enter your username or registered email address."}, status=400)

    User = get_user_model()
    user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
    if not user:
        return JsonResponse({"error": "No university ERP account found matching this email or username."}, status=404)

    if new_password:
        if len(new_password) < 4:
            return JsonResponse({"error": "New password must be at least 4 characters long."}, status=400)
        user.set_password(new_password)
        user.save()
        return JsonResponse({
            "success": True,
            "message": f"Password reset successful for {user.username}! You can now sign in with your new password.",
            "completed": True
        })
    else:
        return JsonResponse({
            "success": True,
            "verified": True,
            "username": user.username,
            "email": user.email,
            "message": f"Account verified for {user.get_full_name() or user.username}. Please enter your new password below."
        })


@csrf_exempt
def logout_api(request):
    if request.user.is_authenticated:
        log_audit(
            request=request,
            action=AuditLog.Actions.USER_LOGOUT,
            resource="Auth",
            details={"username": request.user.username}
        )
    logout(request)
    return JsonResponse({"success": True})


def me_api(request):
    """Returns current user details, role, and student/employee info."""
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"authenticated": False, "roles": []})

    if not user.is_active:
        logout(request)
        return JsonResponse({
            "authenticated": False,
            "error": "Account deactivated",
            "roles": []
        }, status=403)

    roles = list(user_roles(user))
    profile_data = {}
    if hasattr(user, "employee_profile"):
        emp = user.employee_profile
        profile_data = {
            "type": "employee",
            "staff_id": emp.staff_id,
            "department": emp.department,
            "designation": emp.designation,
        }
    elif hasattr(user, "erp_profile"):
        prof = user.erp_profile
        profile_data = {
            "type": "erp_user",
            "staff_id": prof.staff_id,
            "department": prof.department,
            "phone": prof.phone,
        }
    elif hasattr(user, "student_profile"):
        stu = user.student_profile
        profile_data = {
            "type": "student",
            "roll_no": stu.roll_no,
            "name": stu.name,
        }

    return JsonResponse({
        "authenticated": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": primary_role(user),
            "roles": roles,
            "is_superuser": user.is_superuser,
            "profile": profile_data,
            "accessible_modules": get_accessible_modules_for_user(user),
            "permissions": get_user_permissions(user),
        }
    })


def demo_users_api(request):
    """Return available demo users for easy role testing."""
    User = get_user_model()
    users = []
    for u in User.objects.all()[:15]:
        roles = list(user_roles(u))
        users.append({
            "id": u.id,
            "username": u.username,
            "roles": roles,
            "is_superuser": u.is_superuser,
            "name": u.get_full_name() or u.username,
        })
    return JsonResponse({"users": users})


def system_info_api(request):
    """API endpoint for Platform Architecture -> System Info sidebar item."""
    import django
    import sys
    return JsonResponse({
        "status": "OPERATIONAL",
        "service": "Apex University ERP Backend Engine",
        "version": "v2.4.0 (Enterprise Production)",
        "django_version": django.get_version(),
        "python_version": sys.version.split()[0],
        "database_engine": "SQLite / PostgreSQL Double-Entry Store",
        "features": [
            "Atomic Double-Entry General Ledger",
            "Signed Razorpay & Cashfree Payment Webhooks",
            "Single Quota Student Scholarship Concession Engine",
            "Attendance-linked Automated Payroll & LOP Calculation",
            "PDF Tax Receipt & Form 16 Payslip Generator",
            "Institutional Declared Holidays & Academic Calendar",
        ],
        "endpoints": [
            "/api/finance/dashboard/", "/api/finance/meta/", "/api/finance/tax-compliance/",
            "/api/fees/allocate/", "/api/portal/dues/", "/api/portal/payslips/",
            "/api/ledger/general/", "/api/ledger/vouchers/", "/api/holidays/",
            "/api/hr/employees/", "/api/hr/employees/appraisals/", "/api/hr/statutory-compliance/"
        ]
    })


@csrf_exempt
def access_matrix_api(request):
    """Retrieve or update module access declaration matrix (Super Admin & Finance Admin)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if not (request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)):
        return JsonResponse({"error": "Forbidden: Super Admin access required"}, status=403)

    target_roles = [
        Roles.ACCOUNTANT,
        Roles.FEE_MANAGER,
        Roles.FINANCE_USER,
        Roles.FINANCE_ADMIN,
        Roles.VIEWER,
        Roles.HR_ADMIN,
        Roles.EMPLOYEE,
        Roles.STUDENT_PARENT,
    ]

    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST

        action = data.get("action")
        if action == "reset":
            RoleModuleAccess.objects.all().delete()
            seed_default_permissions(force=True)
            log_audit(
                request=request,
                action=AuditLog.Actions.PERMISSION_CHANGED,
                resource="RoleModuleAccess",
                details={"action": "reset_to_defaults"}
            )
        elif "matrix" in data:
            matrix_data = data.get("matrix", {})
            with transaction.atomic():
                for role_name, modules in matrix_data.items():
                    if role_name in target_roles:
                        for mod_id, is_granted in modules.items():
                            if mod_id in ALL_MODULE_IDS:
                                RoleModuleAccess.objects.update_or_create(
                                    role=role_name,
                                    module_id=mod_id,
                                    defaults={"is_granted": bool(is_granted)}
                                )
                                RolePermission.objects.update_or_create(
                                    role=role_name,
                                    module_id=mod_id,
                                    defaults={"can_view": bool(is_granted)}
                                )
                log_audit(
                    request=request,
                    action=AuditLog.Actions.PERMISSION_CHANGED,
                    resource="RoleModuleAccess",
                    details={"action": "batch_matrix_update"}
                )
        elif "role" in data and "module_id" in data:
            role_name = str(data.get("role", "")).strip()
            mod_id = str(data.get("module_id", "")).strip()
            is_granted = bool(data.get("is_granted", False))
            if role_name in target_roles and mod_id in ALL_MODULE_IDS:
                RoleModuleAccess.objects.update_or_create(
                    role=role_name,
                    module_id=mod_id,
                    defaults={"is_granted": is_granted}
                )
                RolePermission.objects.update_or_create(
                    role=role_name,
                    module_id=mod_id,
                    defaults={"can_view": is_granted}
                )
                log_audit(
                    request=request,
                    action=AuditLog.Actions.PERMISSION_CHANGED,
                    resource="RoleModuleAccess",
                    details={"role": role_name, "module_id": mod_id, "is_granted": is_granted}
                )

    # Build response matrix
    overrides = {
        (rma.role, rma.module_id): rma.is_granted
        for rma in RoleModuleAccess.objects.all()
    }
    current_matrix = {}
    for role_name in target_roles:
        current_matrix[role_name] = {}
        defaults = set(DEFAULT_ROLE_ACCESS.get(role_name, []))
        for mid in ALL_MODULE_IDS:
            if (role_name, mid) in overrides:
                current_matrix[role_name][mid] = overrides[(role_name, mid)]
            else:
                current_matrix[role_name][mid] = (mid in defaults)

    return JsonResponse({
        "success": True,
        "roles": target_roles,
        "categories": SYSTEM_MODULES,
        "matrix": current_matrix,
        "super_admin_modules": ALL_MODULE_IDS + ["role-permissions"]
    })

