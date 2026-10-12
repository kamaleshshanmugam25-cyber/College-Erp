from django.urls import path
from . import views

app_name = "hr"
urlpatterns = [
    path("hr/leaves/", views.LeaveApprovalListView.as_view(), name="leave_approvals"),
    path("hr/leaves/<int:pk>/<str:decision>/", views.LeaveDecisionView.as_view(), name="leave_decide"),
    path("portal/payslips/", views.MyPayslipsView.as_view(), name="my_payslips"),
    path("portal/payslips/<int:pk>/pdf/", views.PayslipPDFView.as_view(), name="payslip_pdf"),
]
