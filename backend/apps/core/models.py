from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from .rbac import has_role


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):  # bulk deletes are soft too
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class ScopedQuerySet(SoftDeleteQuerySet):
    """Row-level security. Subclasses declare:
        admin_groups  - roles that see every row
        owner_lookups - ORM paths that must equal the requesting user
    Everyone else only sees rows they own: `Model.objects.visible_to(request.user)`.
    """
    admin_groups: tuple = ()
    owner_lookups: tuple = ()

    def visible_to(self, user):
        if not getattr(user, "is_authenticated", False):
            return self.none()
        if has_role(user, *self.admin_groups):
            return self.all()
        q = Q()
        for lookup in self.owner_lookups:
            q |= Q(**{lookup: user})
        return self.filter(q).distinct() if q else self.none()


def alive_manager(qs_class=SoftDeleteQuerySet):
    """Default manager hiding soft-deleted rows."""
    class _Manager(models.Manager.from_queryset(qs_class)):
        def get_queryset(self):
            return super().get_queryset().filter(is_deleted=False)
    return _Manager()


class BaseModel(TimeStampedModel):
    """Audit timestamps + soft delete. `objects` hides deleted rows, `all_objects` shows them."""
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = alive_manager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted, self.deleted_at = True, timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def hard_delete(self):
        return super().delete()


class NumberSequence(models.Model):
    """Gap-free counters (receipt numbers, voucher numbers). Row-locked while incrementing."""
    key = models.CharField(max_length=64, unique=True)
    last_value = models.PositiveBigIntegerField(default=0)

    @classmethod
    def next_value(cls, key: str) -> int:
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(key=key)
            seq.last_value += 1
            seq.save(update_fields=["last_value"])
            return seq.last_value


class RoleModuleAccess(models.Model):
    """Stores which modules are declared accessible for each role by Super Admin."""
    role = models.CharField(max_length=64, db_index=True)
    module_id = models.CharField(max_length=64, db_index=True)
    is_granted = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("role", "module_id")

    def __str__(self):
        return f"{self.role} -> {self.module_id} ({'Granted' if self.is_granted else 'Revoked'})"


class UserProfile(models.Model):
    """Extended departmental & institutional profile for users."""
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE, related_name="erp_profile")
    department = models.CharField(max_length=128, default="Finance & Accounts", blank=True)
    staff_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.department} ({self.staff_id or 'No ID'})"


class RolePermission(models.Model):
    """Granular action-level permissions per module for each role."""
    role = models.CharField(max_length=64, db_index=True)
    module_id = models.CharField(max_length=64, db_index=True)
    can_view = models.BooleanField(default=True)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    can_export = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("role", "module_id")

    def __str__(self):
        return f"{self.role} -> {self.module_id} (V:{self.can_view} C:{self.can_create} E:{self.can_edit} D:{self.can_delete} A:{self.can_approve} X:{self.can_export})"


class AuditLog(models.Model):
    """Immutable audit trail for all user operations, role changes, and security events."""
    class Actions:
        USER_LOGIN = "USER_LOGIN"
        USER_LOGOUT = "USER_LOGOUT"
        LOGIN_FAILED = "LOGIN_FAILED"
        USER_CREATED = "USER_CREATED"
        USER_UPDATED = "USER_UPDATED"
        USER_ACTIVATED = "USER_ACTIVATED"
        USER_DEACTIVATED = "USER_DEACTIVATED"
        PASSWORD_RESET = "PASSWORD_RESET"
        ROLE_ASSIGNED = "ROLE_ASSIGNED"
        ROLE_CHANGED = "ROLE_CHANGED"
        PERMISSION_CHANGED = "PERMISSION_CHANGED"
        FEE_ALLOCATED = "FEE_ALLOCATED"
        INVOICE_GENERATED = "INVOICE_GENERATED"
        PAYMENT_RECORDED = "PAYMENT_RECORDED"
        VOUCHER_POSTED = "VOUCHER_POSTED"
        ACCESS_DENIED = "ACCESS_DENIED"

    actor = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    actor_username = models.CharField(max_length=150, default="System", db_index=True)
    actor_role = models.CharField(max_length=64, default="System")
    action = models.CharField(max_length=64, db_index=True)
    resource = models.CharField(max_length=128, db_index=True)
    resource_id = models.CharField(max_length=64, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=256, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.actor_username} ({self.actor_role}) -> {self.action} on {self.resource}"


