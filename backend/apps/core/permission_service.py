from .models import RolePermission, RoleModuleAccess
from .rbac import Roles, user_roles

MODULE_DEFINITIONS = [
    {"id": "finance-dashboard", "name": "Financial Overview", "category": "Finance & Accounting"},
    {"id": "fee-structures", "name": "Fee Structures & Calculator", "category": "Finance & Accounting"},
    {"id": "invoices-receipts", "name": "Invoices & Receipts", "category": "Finance & Accounting"},
    {"id": "scholarships", "name": "Scholarships & Waivers", "category": "Finance & Accounting"},
    {"id": "general-ledger", "name": "General & Journal Ledger", "category": "Finance & Accounting"},
    {"id": "financial-reports", "name": "Financial Reports & Audits", "category": "Finance & Accounting"},
    {"id": "user-management", "name": "User Management", "category": "Administration & Security"},
    {"id": "role-permissions", "name": "Role & Permissions", "category": "Administration & Security"},
    {"id": "audit-logs", "name": "Audit Logs", "category": "Administration & Security"},
    {"id": "employee-lifecycle", "name": "Employee Lifecycle", "category": "HR & Operations"},
    {"id": "attendance-leaves", "name": "Attendance & Leaves", "category": "HR & Operations"},
    {"id": "holidays", "name": "Declared Holidays", "category": "HR & Operations"},
    {"id": "performance-appraisal", "name": "Performance Appraisals", "category": "HR & Operations"},
]

DEFAULT_ROLE_PERMISSIONS = {
    Roles.SUPER_ADMIN: {
        mid: {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True}
        for mid in [m["id"] for m in MODULE_DEFINITIONS]
    },
    Roles.FINANCE_ADMIN: {
        "finance-dashboard": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "fee-structures": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "invoices-receipts": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "scholarships": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "general-ledger": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "financial-reports": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "user-management": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "role-permissions": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "audit-logs": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": True},
        "employee-lifecycle": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "attendance-leaves": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "holidays": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "performance-appraisal": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
    Roles.FINANCE_USER: {
        "finance-dashboard": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": True},
        "fee-structures": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "invoices-receipts": {"view": True, "create": True, "edit": True, "delete": False, "approve": False, "export": True},
        "scholarships": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "general-ledger": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "financial-reports": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": True},
        "user-management": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "role-permissions": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "audit-logs": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
    Roles.ACCOUNTANT: {
        "finance-dashboard": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": True},
        "fee-structures": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "invoices-receipts": {"view": True, "create": True, "edit": True, "delete": False, "approve": True, "export": True},
        "scholarships": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "general-ledger": {"view": True, "create": True, "edit": False, "delete": False, "approve": False, "export": True},
        "financial-reports": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": True},
        "user-management": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "role-permissions": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "audit-logs": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
    Roles.FEE_MANAGER: {
        "finance-dashboard": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "fee-structures": {"view": True, "create": True, "edit": True, "delete": False, "approve": False, "export": True},
        "invoices-receipts": {"view": True, "create": True, "edit": True, "delete": False, "approve": False, "export": True},
        "scholarships": {"view": True, "create": True, "edit": True, "delete": False, "approve": False, "export": True},
        "general-ledger": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "financial-reports": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "user-management": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "role-permissions": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "audit-logs": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
    Roles.HR_ADMIN: {
        "employee-lifecycle": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "attendance-leaves": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "holidays": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "performance-appraisal": {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True},
        "finance-dashboard": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "fee-structures": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "invoices-receipts": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "general-ledger": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
    Roles.VIEWER: {
        "finance-dashboard": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "fee-structures": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "invoices-receipts": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "scholarships": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "financial-reports": {"view": True, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "general-ledger": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "user-management": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "role-permissions": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
        "audit-logs": {"view": False, "create": False, "edit": False, "delete": False, "approve": False, "export": False},
    },
}


def seed_default_permissions(force=False):
    """Initializes or resets RolePermission database table."""
    if not force and RolePermission.objects.exists():
        return
    for role, module_map in DEFAULT_ROLE_PERMISSIONS.items():
        for mod_id, perms in module_map.items():
            RolePermission.objects.update_or_create(
                role=role,
                module_id=mod_id,
                defaults={
                    "can_view": perms.get("view", False),
                    "can_create": perms.get("create", False),
                    "can_edit": perms.get("edit", False),
                    "can_delete": perms.get("delete", False),
                    "can_approve": perms.get("approve", False),
                    "can_export": perms.get("export", False),
                }
            )


def get_user_permissions(user) -> dict:
    """Computes aggregated granular permissions for a user across all assigned roles."""
    if not getattr(user, "is_authenticated", False):
        return {}

    # Super Admin gets full access everywhere
    if user.is_superuser:
        return {
            m["id"]: {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True}
            for m in MODULE_DEFINITIONS
        }

    roles = list(user_roles(user))
    if Roles.SUPER_ADMIN in roles:
        return {
            m["id"]: {"view": True, "create": True, "edit": True, "delete": True, "approve": True, "export": True}
            for m in MODULE_DEFINITIONS
        }

    # Aggregate permissions across roles
    perms_map = {}
    for mod in MODULE_DEFINITIONS:
        perms_map[mod["id"]] = {
            "view": False, "create": False, "edit": False,
            "delete": False, "approve": False, "export": False
        }

    # First load from database or defaults
    for role in roles:
        role_db_perms = {rp.module_id: rp for rp in RolePermission.objects.filter(role=role)}
        default_role_map = DEFAULT_ROLE_PERMISSIONS.get(role, {})

        for mod in MODULE_DEFINITIONS:
            mid = mod["id"]
            if mid in role_db_perms:
                rp = role_db_perms[mid]
                p_v = rp.can_view
                p_c = rp.can_create
                p_e = rp.can_edit
                p_d = rp.can_delete
                p_a = rp.can_approve
                p_x = rp.can_export
            elif mid in default_role_map:
                dp = default_role_map[mid]
                p_v = dp.get("view", False)
                p_c = dp.get("create", False)
                p_e = dp.get("edit", False)
                p_d = dp.get("delete", False)
                p_a = dp.get("approve", False)
                p_x = dp.get("export", False)
            else:
                continue

            target = perms_map[mid]
            target["view"] = target["view"] or p_v
            target["create"] = target["create"] or p_c
            target["edit"] = target["edit"] or p_e
            target["delete"] = target["delete"] or p_d
            target["approve"] = target["approve"] or p_a
            target["export"] = target["export"] or p_x

    return perms_map


def check_permission(user, module_id: str, action: str = "view") -> bool:
    """
    Checks if the user has permission to perform `action` on `module_id`.
    action can be: 'view', 'create', 'edit', 'delete', 'approve', 'export'.
    """
    if not getattr(user, "is_authenticated", False):
        return False
    if user.is_superuser:
        return True
    roles = user_roles(user)
    if Roles.SUPER_ADMIN in roles:
        return True

    perms = get_user_permissions(user)
    mod_perms = perms.get(module_id)
    if not mod_perms:
        return False
    return bool(mod_perms.get(action, False))
