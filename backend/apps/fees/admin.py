from django.contrib import admin
from . import models as m


class SoftDeleteAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return self.model.all_objects.all()


@admin.register(m.Student)
class StudentAdmin(SoftDeleteAdmin):
    list_display = ("roll_no", "name", "course", "user")
    list_filter = ("course",)
    search_fields = ("roll_no", "name", "user__username")


for model in (m.Course, m.QuotaCategory, m.LateFeeRule, m.StudentFee, m.FeeInstallment):
    admin.site.register(model, SoftDeleteAdmin)


@admin.register(m.PaymentTransaction)
class TxnAdmin(SoftDeleteAdmin):
    list_display = ("order_id", "gateway", "amount", "status", "paid_at")
    list_filter = ("status", "gateway")
    readonly_fields = ("webhook_payload", "gateway_txn_id", "status", "paid_at")  # state changes via services only


@admin.register(m.FeeReceipt)
class ReceiptAdmin(SoftDeleteAdmin):
    list_display = ("receipt_number", "timestamp")
