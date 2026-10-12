from django.urls import path
from . import views

app_name = "finance"
urlpatterns = [
    path("finance/", views.FinanceDashboardView.as_view(), name="dashboard"),
    path("finance/batches/", views.BatchesPartialView.as_view(), name="batches"),
    path("finance/calculator/", views.FeeCalculatorView.as_view(), name="calculator"),
    path("portal/dues/", views.MyDuesView.as_view(), name="my_dues"),
    path("portal/receipts/<int:pk>/pdf/", views.ReceiptPDFView.as_view(), name="receipt_pdf"),
]
