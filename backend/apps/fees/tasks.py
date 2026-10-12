from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from apps.core.pdf import render_pdf
from .models import FeeReceipt


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def generate_receipt_pdf(self, receipt_id: int):
    """Idempotent: safe to retry or enqueue twice."""
    receipt = FeeReceipt.objects.select_related(
        "transaction__fee__student", "transaction__fee__course").get(pk=receipt_id)
    if receipt.pdf_file:
        return receipt.pdf_file.name
    pdf = render_pdf("pdf/receipt.html", {"receipt": receipt, "txn": receipt.transaction,
                                          "fee": receipt.transaction.fee})
    receipt.pdf_file.save(f"{receipt.receipt_number}.pdf", ContentFile(pdf), save=False)
    receipt.pdf_generated_at = timezone.now()
    receipt.save(update_fields=["pdf_file", "pdf_generated_at", "updated_at"])
    return receipt.pdf_file.name
