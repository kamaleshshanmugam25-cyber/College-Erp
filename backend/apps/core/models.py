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
