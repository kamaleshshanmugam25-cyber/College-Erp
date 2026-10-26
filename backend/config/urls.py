from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.fees import api as fees_api, views as fees_views
from apps.core import views as core_views, admin_api
from apps.hr import api as hr_api, views as hr_views
from apps.ledger import api as ledger_api

router = DefaultRouter()
router.register("fees", fees_api.StudentFeeViewSet, basename="fee")
router.register("receipts", fees_api.ReceiptViewSet, basename="receipt")
router.register("attendance", hr_api.AttendanceViewSet, basename="attendance")
router.register("leaves", hr_api.LeaveViewSet, basename="leave")
router.register("payroll", hr_api.PayrollViewSet, basename="payroll")
router.register("hr/employees", hr_api.EmployeeViewSet, basename="employee")
router.register("holidays", hr_api.HolidayViewSet, basename="holiday")
router.register("ledger/general", ledger_api.GeneralLedgerViewSet, basename="general_ledger")
router.register("ledger/vouchers", ledger_api.JournalVoucherViewSet, basename="journal_voucher")



urlpatterns = [
    path("admin/", admin.site.urls),
    # REST API endpoints for React Frontend
    path("api/auth/csrf/", core_views.csrf_api, name="api_csrf"),
    path("api/auth/login/", core_views.login_api, name="api_login"),
    path("api/auth/register/", core_views.register_api, name="api_register"),
    path("api/auth/forgot-password/", core_views.forgot_password_api, name="api_forgot_password"),
    path("api/auth/logout/", core_views.logout_api, name="api_logout"),
    path("api/auth/me/", core_views.me_api, name="api_me"),
    path("api/auth/demo-users/", core_views.demo_users_api, name="api_demo_users"),
    path("api/finance/dashboard/", fees_views.finance_dashboard_api, name="api_finance_dashboard"),
    path("api/finance/meta/", fees_views.finance_meta_api, name="api_finance_meta"),
    path("api/finance/courses/create/", fees_views.create_course_api, name="api_create_course"),
    path("api/finance/quotas/create/", fees_views.create_quota_api, name="api_create_quota"),
    path("api/finance/calculator/", fees_views.fee_calculator_api, name="api_fee_calculator"),
    path("api/fees/allocate/", fees_views.allocate_fee_api, name="api_allocate_fee"),
    path("api/finance/department-fee-allocate/", fees_views.allocate_department_fee_api, name="api_dept_fee_allocate"),
    path("api/invoices/", fees_views.invoices_api, name="api_invoices"),
    path("api/finance/tax-compliance/", fees_views.tax_compliance_api, name="api_tax_compliance"),
    path("api/portal/dues/", fees_views.my_dues_api, name="api_my_dues"),
    path("api/portal/my-scholarships/", fees_views.my_scholarships_api, name="api_my_scholarships"),
    path("api/portal/payslips/", hr_views.my_payslips_api, name="api_my_payslips"),
    path("api/hr/statutory-compliance/", hr_views.statutory_compliance_api, name="api_hr_statutory_compliance"),
    path("api/system/info/", core_views.system_info_api, name="api_system_info"),
    path("api/core/access-matrix/", core_views.access_matrix_api, name="api_access_matrix"),

    # Admin User Management, Granular Permissions & Audit Logs
    path("api/admin/users/", admin_api.users_list_api, name="api_admin_users"),
    path("api/admin/users/<int:user_id>/", admin_api.user_detail_api, name="api_admin_user_detail"),
    path("api/admin/users/<int:user_id>/reset-password/", admin_api.user_reset_password_api, name="api_admin_reset_password"),
    path("api/admin/permissions/", admin_api.permissions_matrix_api, name="api_admin_permissions"),
    path("api/admin/audit-logs/", admin_api.audit_logs_api, name="api_admin_audit_logs"),

    path("api/", include(router.urls)),

    path("webhooks/<str:gateway>/", fees_views.payment_webhook, name="payment_webhook"),
    path("login/", auth_views.LoginView.as_view(), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("", include("apps.fees.urls")),
    path("", include("apps.hr.urls")),
    path("", core_views.landing, name="landing"),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
