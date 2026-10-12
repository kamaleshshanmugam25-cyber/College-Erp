from django.contrib import admin
from . import models as m


class SoftDeleteAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return self.model.all_objects.all()


for model in (m.Holiday, m.Attendance, m.LeaveApplication, m.Payroll):
    admin.site.register(model, SoftDeleteAdmin)


@admin.register(m.Employee)
class EmployeeAdmin(SoftDeleteAdmin):
    list_display = ("staff_id", "user", "department", "designation", "employee_type", "lifecycle_status", "is_active")
    list_filter = ("department", "employee_type", "lifecycle_status", "is_active")
    search_fields = ("staff_id", "user__first_name", "user__last_name", "user__username", "department", "designation")
    exclude = ("account_number",)  # keep bank numbers out of the admin UI by default
