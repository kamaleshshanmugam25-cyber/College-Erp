from celery import shared_task

from .services import generate_payroll_batch


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def run_payroll(self, year: int, month: int):
    """Async payroll run. Atomic inside the service, so a retry after a crash is safe."""
    return generate_payroll_batch(year, month)
