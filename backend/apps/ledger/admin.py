from django.contrib import admin
from .models import GeneralLedger, JournalVoucher


class ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, r): return False
    def has_change_permission(self, r, obj=None): return False
    def has_delete_permission(self, r, obj=None): return False


admin.site.register(JournalVoucher, ReadOnly)
admin.site.register(GeneralLedger, ReadOnly)
