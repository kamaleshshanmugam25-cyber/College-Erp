from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.rbac import ROLE_PERMISSIONS


class Command(BaseCommand):
    help = "Create/refresh the five role groups and their permissions (idempotent)."

    @transaction.atomic
    def handle(self, *args, **opts):
        all_perms = Permission.objects.select_related("content_type")
        for role, specs in ROLE_PERMISSIONS.items():
            perms = set()
            for spec in specs:
                if spec == "*":
                    perms.update(all_perms.filter(content_type__app_label__in=["fees", "ledger", "hr"]))
                elif spec.endswith(".*"):
                    perms.update(all_perms.filter(content_type__app_label=spec[:-2]))
                else:
                    app, code = spec.split(".")
                    perms.update(all_perms.filter(content_type__app_label=app, codename=code))
            group, _ = Group.objects.get_or_create(name=role)
            group.permissions.set(perms)
            self.stdout.write(f"{role}: {len(perms)} permissions")
