import json
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, Count
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .rbac import Roles, has_role, user_roles, primary_role
from .models import UserProfile, RolePermission, AuditLog
from .audit import log_audit
from .permission_service import (
    MODULE_DEFINITIONS,
    DEFAULT_ROLE_PERMISSIONS,
    seed_default_permissions,
    get_user_permissions,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def require_admin(view_func):
    """Decorator requiring Finance Admin or Super Admin role with audit logging on failure."""
    def wrapped(request, *args, **kwargs):
        if not getattr(request.user, "is_authenticated", False):
            return JsonResponse({"error": "Authentication required"}, status=401)
        if not (request.user.is_superuser or has_role(request.user, Roles.FINANCE_ADMIN, Roles.SUPER_ADMIN)):
            log_audit(
                request=request,
                action=AuditLog.Actions.ACCESS_DENIED,
                resource=request.path,
                details={"reason": "Attempted administrative operation without Finance Admin or Super Admin role"}
            )
            return JsonResponse({
                "error": "Forbidden: Requires Finance Admin or Super Admin role",
                "code": "ACCESS_DENIED"
            }, status=403)
        return view_func(request, *args, **kwargs)
    wrapped.__name__ = view_func.__name__
    return wrapped


def serialize_user(u):
    """Serializes a User instance into a clean dictionary."""
    from apps.core.views import get_accessible_modules_for_user
    profile = getattr(u, "erp_profile", None)
    emp_profile = getattr(u, "employee_profile", None)

    department = ""
    staff_id = ""
    phone = ""
    notes = ""
    has_custom_permissions = False
    custom_modules = []

    if profile:
        department = profile.department
        staff_id = profile.staff_id or ""
        phone = profile.phone or ""
        notes = profile.notes or ""
        has_custom_permissions = getattr(profile, "has_custom_permissions", False)
        custom_modules = getattr(profile, "custom_modules", []) or []
    elif emp_profile:
        department = emp_profile.department
        staff_id = emp_profile.staff_id or ""

    roles = list(user_roles(u))
    role_name = primary_role(u)

    return {
        "id": u.id,
        "username": u.username,
        "name": u.get_full_name() or u.username,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "role": role_name,
        "roles": roles,
        "department": department or "Finance & Accounts",
        "staff_id": staff_id,
        "phone": phone,
        "notes": notes,
        "has_custom_permissions": has_custom_permissions,
        "custom_modules": custom_modules,
        "accessible_modules": get_accessible_modules_for_user(u),
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "is_staff": u.is_staff,
        "last_login": u.last_login.strftime("%d %b %Y, %H:%M") if u.last_login else None,
        "date_joined": u.date_joined.strftime("%d %b %Y") if u.date_joined else None,
    }


@csrf_exempt
@require_admin
def users_list_api(request):
    """
    GET: List users with search, role filter, status filter, pagination and stats.
    POST: Create a new user with role and profile.
    """
    if request.method == "GET":
        qs = User.objects.all().select_related("erp_profile").prefetch_related("groups")

        # Search filter
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(erp_profile__staff_id__icontains=search) |
                Q(erp_profile__department__icontains=search)
            )

        is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
        if not is_super:
            # Finance Admin can manage Finance team and any newly assigned institutional roles (excluding Super Admin, HR, Student, Employee)
            qs = qs.exclude(is_superuser=True).exclude(groups__name__in=[Roles.SUPER_ADMIN, Roles.HR_ADMIN, Roles.EMPLOYEE, Roles.STUDENT_PARENT]).filter(student_profile__isnull=True, employee_profile__isnull=True).distinct()

        # Role filter
        role_filter = request.GET.get("role", "").strip()
        if role_filter and role_filter != "ALL":
            if role_filter == Roles.SUPER_ADMIN:
                qs = qs.filter(is_superuser=True)
            else:
                qs = qs.filter(groups__name=role_filter)

        # Status filter
        status_filter = request.GET.get("status", "all").strip().lower()
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)

        # Ordering
        ordering = request.GET.get("ordering", "-id").strip()
        allowed_orderings = ["id", "-id", "username", "-username", "email", "-email", "date_joined", "-date_joined", "last_login", "-last_login"]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-id")

        # Global stats (scoped to Finance Admin authority)
        if not is_super:
            all_users = User.objects.exclude(is_superuser=True).exclude(groups__name__in=[Roles.SUPER_ADMIN, Roles.HR_ADMIN, Roles.EMPLOYEE, Roles.STUDENT_PARENT]).filter(student_profile__isnull=True, employee_profile__isnull=True).distinct()
            total_count = all_users.count()
            active_count = all_users.filter(is_active=True).count()
            inactive_count = total_count - active_count
            role_counts = {}
            for u in all_users:
                r = primary_role(u)
                role_counts[r] = role_counts.get(r, 0) + 1
        else:
            all_users = User.objects.all()
            total_count = all_users.count()
            active_count = all_users.filter(is_active=True).count()
            inactive_count = total_count - active_count
            role_counts = {}
            for r in Roles.ALL:
                if r == Roles.SUPER_ADMIN:
                    role_counts[r] = all_users.filter(is_superuser=True).count()
                else:
                    role_counts[r] = all_users.filter(groups__name=r).count()

        # Pagination
        page_num = int(request.GET.get("page", 1))
        page_size = min(int(request.GET.get("page_size", 10)), 100)
        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_num)

        serialized_users = [serialize_user(u) for u in page.object_list]

        return JsonResponse({
            "success": True,
            "users": serialized_users,
            "stats": {
                "total_users": total_count,
                "active_users": active_count,
                "inactive_users": inactive_count,
                "role_counts": role_counts,
            },
            "pagination": {
                "page": page.number,
                "page_size": page_size,
                "total_records": paginator.count,
                "total_pages": paginator.num_pages,
                "has_next": page.has_next(),
                "has_previous": page.has_previous(),
            }
        })

    elif request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST

        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        full_name = str(data.get("name") or data.get("full_name", "")).strip()
        password = str(data.get("password", "")).strip()
        role = str(data.get("role", Roles.ACCOUNTANT)).strip()
        department = str(data.get("department", "Finance & Accounts")).strip()
        staff_id = str(data.get("staff_id", "")).strip()
        phone = str(data.get("phone", "")).strip()
        is_active = bool(data.get("is_active", True))

        # Validation
        if not username:
            return JsonResponse({"error": "Username is required"}, status=400)
        if len(username) < 3:
            return JsonResponse({"error": "Username must be at least 3 characters"}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({"error": f"Username '{username}' is already taken"}, status=400)

        if not email:
            return JsonResponse({"error": "Email address is required"}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"error": "Invalid email address format"}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({"error": f"Email '{email}' is already registered to another user"}, status=400)

        if not password:
            return JsonResponse({"error": "Initial password is required"}, status=400)
        if len(password) < 4:
            return JsonResponse({"error": "Password must be at least 4 characters long"}, status=400)

        is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
        if not is_super and role == Roles.SUPER_ADMIN:
            return JsonResponse({"error": "Finance Admin cannot assign Super Admin role."}, status=400)
        if not role or len(role.strip()) < 2:
            return JsonResponse({"error": "Role name must be at least 2 characters long."}, status=400)

        parts = full_name.split(maxsplit=1)
        first_name = parts[0] if parts else username
        last_name = parts[1] if len(parts) > 1 else ""

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=is_active
            )

            # Assign superuser status if Super Admin
            if role == Roles.SUPER_ADMIN:
                user.is_superuser = True
                user.is_staff = True
                user.save(update_fields=["is_superuser", "is_staff"])

            # Assign Group
            grp, _ = Group.objects.get_or_create(name=role)
            user.groups.add(grp)

            # Create UserProfile
            has_custom = bool(data.get("has_custom_permissions", False))
            custom_mods = data.get("custom_modules", [])
            from apps.core.views import ALL_MODULE_IDS
            valid_mods = [m for m in custom_mods if m in ALL_MODULE_IDS] if (has_custom and isinstance(custom_mods, list)) else []

            UserProfile.objects.create(
                user=user,
                department=department or "Finance & Accounts",
                staff_id=staff_id or None,
                phone=phone,
                has_custom_permissions=has_custom,
                custom_modules=valid_mods
            )

            log_audit(
                request=request,
                action=AuditLog.Actions.USER_CREATED,
                resource="User",
                resource_id=user.id,
                details={
                    "created_username": user.username,
                    "email": user.email,
                    "assigned_role": role,
                    "department": department,
                    "is_active": is_active,
                }
            )

        return JsonResponse({
            "success": True,
            "message": f"User account '{user.username}' successfully created with role '{role}'.",
            "user": serialize_user(user)
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@require_admin
def user_detail_api(request, user_id):
    """
    GET: Retrieve full details and recent audit trail for a user.
    PATCH: Update user metadata, role, status with self-lockout safeguards.
    DELETE: Soft deactivate user.
    """
    try:
        target_user = User.objects.select_related("erp_profile").get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    is_self = (request.user.id == target_user.id)
    is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
    if not is_super:
        target_role = primary_role(target_user)
        if target_user.is_superuser or target_role in (Roles.SUPER_ADMIN, Roles.HR_ADMIN, Roles.EMPLOYEE, Roles.STUDENT_PARENT):
            return JsonResponse({"error": "Access denied. Finance Admin cannot manage institutional administrators or non-finance employees."}, status=403)

    if request.method == "GET":
        recent_logs = AuditLog.objects.filter(
            Q(actor=target_user) | Q(resource_id=str(target_user.id))
        ).order_by("-created_at")[:10]

        logs_data = [{
            "id": l.id,
            "action": l.action,
            "resource": l.resource,
            "details": l.details,
            "timestamp": l.created_at.strftime("%d %b %Y, %H:%M"),
        } for l in recent_logs]

        user_perms = get_user_permissions(target_user)

        return JsonResponse({
            "success": True,
            "user": serialize_user(target_user),
            "permissions": user_perms,
            "recent_activity": logs_data,
        })

    elif request.method in ("PATCH", "POST", "PUT"):
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST

        name = data.get("name")
        email = data.get("email")
        department = data.get("department")
        staff_id = data.get("staff_id")
        phone = data.get("phone")
        notes = data.get("notes")
        new_role = data.get("role")
        is_active = data.get("is_active")

        audit_changes = {}

        with transaction.atomic():
            # Status change with self-lockout protection
            if is_active is not None:
                new_active = bool(is_active)
                if is_self and not new_active:
                    return JsonResponse({
                        "error": "Self-Lockout Safeguard: You cannot deactivate your own administrative account.",
                        "code": "SELF_LOCKOUT_FORBIDDEN"
                    }, status=400)
                if target_user.is_active != new_active:
                    audit_changes["is_active"] = {"from": target_user.is_active, "to": new_active}
                    target_user.is_active = new_active
                    target_user.save(update_fields=["is_active"])
                    log_audit(
                        request=request,
                        action=AuditLog.Actions.USER_ACTIVATED if new_active else AuditLog.Actions.USER_DEACTIVATED,
                        resource="User",
                        resource_id=target_user.id,
                        details={"target_username": target_user.username, "new_status": new_active}
                    )

            # Name change
            if name is not None:
                parts = str(name).strip().split(maxsplit=1)
                target_user.first_name = parts[0] if parts else ""
                target_user.last_name = parts[1] if len(parts) > 1 else ""
                target_user.save(update_fields=["first_name", "last_name"])
                audit_changes["name"] = str(name).strip()

            # Email change
            if email is not None and email.strip().lower() != target_user.email.lower():
                clean_email = email.strip().lower()
                try:
                    validate_email(clean_email)
                except ValidationError:
                    return JsonResponse({"error": "Invalid email address format"}, status=400)
                if User.objects.filter(email__iexact=clean_email).exclude(id=target_user.id).exists():
                    return JsonResponse({"error": f"Email '{clean_email}' is already in use by another user"}, status=400)
                audit_changes["email"] = {"from": target_user.email, "to": clean_email}
                target_user.email = clean_email
                target_user.save(update_fields=["email"])

            # Role change with self-lockout protection
            if new_role is not None and new_role != "":
                is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
                if not is_super and new_role == Roles.SUPER_ADMIN:
                    return JsonResponse({"error": "Finance Admin cannot assign Super Admin role."}, status=400)
                if not new_role or len(new_role.strip()) < 2:
                    return JsonResponse({"error": "Role name must be at least 2 characters long."}, status=400)

                current_primary = primary_role(target_user)
                if is_self and new_role not in (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN):
                    return JsonResponse({
                        "error": "Self-Lockout Safeguard: You cannot remove your own administrative privileges.",
                        "code": "SELF_LOCKOUT_FORBIDDEN"
                    }, status=400)

                if current_primary != new_role:
                    audit_changes["role"] = {"from": current_primary, "to": new_role}
                    # Clear finance/admin groups
                    for r in Roles.ALL:
                        g = Group.objects.filter(name=r).first()
                        if g:
                            target_user.groups.remove(g)

                    new_grp, _ = Group.objects.get_or_create(name=new_role)
                    target_user.groups.add(new_grp)
                    if hasattr(target_user, "_erp_roles"):
                        del target_user._erp_roles

                    if new_role == Roles.SUPER_ADMIN:
                        target_user.is_superuser = True
                        target_user.is_staff = True
                    else:
                        if not is_self and target_user.is_superuser:
                            target_user.is_superuser = False
                    target_user.save(update_fields=["is_superuser", "is_staff"])

                    log_audit(
                        request=request,
                        action=AuditLog.Actions.ROLE_CHANGED,
                        resource="User",
                        resource_id=target_user.id,
                        details={"target_username": target_user.username, "from_role": current_primary, "to_role": new_role}
                    )

            # Profile changes
            profile, _ = UserProfile.objects.get_or_create(user=target_user)
            if department is not None:
                profile.department = str(department).strip()
            if staff_id is not None:
                profile.staff_id = str(staff_id).strip() or None
            if phone is not None:
                profile.phone = str(phone).strip()
            if notes is not None:
                profile.notes = str(notes).strip()

            has_custom_perms = data.get("has_custom_permissions")
            custom_mods = data.get("custom_modules")
            if has_custom_perms is not None:
                profile.has_custom_permissions = bool(has_custom_perms)
                audit_changes["has_custom_permissions"] = profile.has_custom_permissions
            if custom_mods is not None and isinstance(custom_mods, list):
                from apps.core.views import ALL_MODULE_IDS
                profile.custom_modules = [m for m in custom_mods if m in ALL_MODULE_IDS]
                audit_changes["custom_modules"] = profile.custom_modules

            profile.save()
            target_user.erp_profile = profile

            if audit_changes:
                log_audit(
                    request=request,
                    action=AuditLog.Actions.USER_UPDATED,
                    resource="User",
                    resource_id=target_user.id,
                    details={"target_username": target_user.username, "changes": audit_changes}
                )

        return JsonResponse({
            "success": True,
            "message": f"User account '{target_user.username}' successfully updated.",
            "user": serialize_user(target_user)
        })

    elif request.method == "DELETE":
        if is_self:
            return JsonResponse({
                "error": "Self-Lockout Safeguard: You cannot delete your own administrative account.",
                "code": "SELF_LOCKOUT_FORBIDDEN"
            }, status=400)

        is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
        if not is_super:
            target_role = primary_role(target_user)
            if target_user.is_superuser or target_role in (Roles.SUPER_ADMIN, Roles.HR_ADMIN, Roles.EMPLOYEE, Roles.STUDENT_PARENT):
                return JsonResponse({"error": "Access denied. Finance Admin cannot delete institutional administrators or non-finance employees."}, status=403)

        username_deleted = target_user.username
        user_id_deleted = target_user.id

        try:
            with transaction.atomic():
                log_audit(
                    request=request,
                    action=getattr(AuditLog.Actions, "USER_DELETED", "USER_DELETED"),
                    resource="User",
                    resource_id=user_id_deleted,
                    details={"target_username": username_deleted, "method": "DELETE_REQUEST"}
                )
                if hasattr(target_user, "erp_profile"):
                    target_user.erp_profile.delete()
                target_user.delete()
        except Exception as e:
            return JsonResponse({"error": f"Failed to delete user '{username_deleted}': {str(e)}"}, status=400)

        return JsonResponse({
            "success": True,
            "message": f"User account '{username_deleted}' has been permanently deleted."
        })

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@require_admin
def user_reset_password_api(request, user_id):
    """Admin-initiated secure password reset for any user."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    is_super = request.user.is_superuser or has_role(request.user, Roles.SUPER_ADMIN)
    if not is_super:
        target_role = primary_role(target_user)
        if target_user.is_superuser or target_role in (Roles.SUPER_ADMIN, Roles.HR_ADMIN, Roles.EMPLOYEE, Roles.STUDENT_PARENT):
            return JsonResponse({"error": "Access denied. Finance Admin cannot manage institutional administrators or non-finance employees."}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        data = request.POST

    new_password = str(data.get("new_password", "")).strip()
    if not new_password:
        return JsonResponse({"error": "New password is required"}, status=400)
    if len(new_password) < 4:
        return JsonResponse({"error": "New password must be at least 4 characters long"}, status=400)

    target_user.set_password(new_password)
    target_user.save(update_fields=["password"])

    log_audit(
        request=request,
        action=AuditLog.Actions.PASSWORD_RESET,
        resource="User",
        resource_id=target_user.id,
        details={"target_username": target_user.username, "initiated_by": request.user.username}
    )

    return JsonResponse({
        "success": True,
        "message": f"Password for '{target_user.username}' has been successfully reset."
    })


@csrf_exempt
@require_admin
def permissions_matrix_api(request):
    """
    GET: Returns the complete matrix of modules x actions per role.
    POST: Update granular permissions for a role (with self-lockout protection for admin tools).
    """
    seed_default_permissions()

    if request.method == "GET":
        target_roles = [
            Roles.FINANCE_ADMIN,
            Roles.ACCOUNTANT,
            Roles.HR_ADMIN,
            Roles.SUPER_ADMIN,
        ]

        matrix = {}
        for role in target_roles:
            matrix[role] = {}
            db_perms = {rp.module_id: rp for rp in RolePermission.objects.filter(role=role)}
            default_map = DEFAULT_ROLE_PERMISSIONS.get(role, {})

            for mod in MODULE_DEFINITIONS:
                mid = mod["id"]
                if mid in db_perms:
                    rp = db_perms[mid]
                    matrix[role][mid] = {
                        "view": rp.can_view,
                        "create": rp.can_create,
                        "edit": rp.can_edit,
                        "delete": rp.can_delete,
                        "approve": rp.can_approve,
                        "export": rp.can_export,
                    }
                else:
                    dp = default_map.get(mid, {})
                    matrix[role][mid] = {
                        "view": dp.get("view", False),
                        "create": dp.get("create", False),
                        "edit": dp.get("edit", False),
                        "delete": dp.get("delete", False),
                        "approve": dp.get("approve", False),
                        "export": dp.get("export", False),
                    }

        return JsonResponse({
            "success": True,
            "roles": target_roles,
            "modules": MODULE_DEFINITIONS,
            "actions": ["view", "create", "edit", "delete", "approve", "export"],
            "matrix": matrix,
        })

    elif request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            data = request.POST

        action_cmd = data.get("action")
        if action_cmd == "reset":
            seed_default_permissions(force=True)
            log_audit(
                request=request,
                action=AuditLog.Actions.PERMISSION_CHANGED,
                resource="RolePermission",
                details={"action": "reset_to_defaults"}
            )
            return JsonResponse({"success": True, "message": "Permissions reset to institutional defaults."})

        role = data.get("role")
        module_id = data.get("module_id")
        perms = data.get("permissions", {})

        if not role or not module_id:
            return JsonResponse({"error": "Role and module_id are required"}, status=400)

        # Critical safeguard: Prevent removing admin access to security modules
        if role in (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN) and module_id in ("user-management", "role-permissions"):
            if not perms.get("view", True):
                return JsonResponse({
                    "error": "Self-Lockout Safeguard: You cannot revoke viewing permissions for administrative tools on admin roles.",
                    "code": "ADMIN_PERMISSION_LOCKED"
                }, status=400)

        rp, _ = RolePermission.objects.update_or_create(
            role=role,
            module_id=module_id,
            defaults={
                "can_view": bool(perms.get("view", False)),
                "can_create": bool(perms.get("create", False)),
                "can_edit": bool(perms.get("edit", False)),
                "can_delete": bool(perms.get("delete", False)),
                "can_approve": bool(perms.get("approve", False)),
                "can_export": bool(perms.get("export", False)),
            }
        )

        from .models import RoleModuleAccess
        RoleModuleAccess.objects.update_or_create(
            role=role,
            module_id=module_id,
            defaults={"is_granted": bool(perms.get("view", False))}
        )

        log_audit(
            request=request,
            action=AuditLog.Actions.PERMISSION_CHANGED,
            resource="RolePermission",
            resource_id=f"{role}:{module_id}",
            details={"role": role, "module_id": module_id, "permissions": perms}
        )

        return JsonResponse({
            "success": True,
            "message": f"Updated permissions for '{role}' on '{module_id}'.",
            "permission": {
                "role": rp.role,
                "module_id": rp.module_id,
                "can_view": rp.can_view,
                "can_create": rp.can_create,
                "can_edit": rp.can_edit,
                "can_delete": rp.can_delete,
                "can_approve": rp.can_approve,
                "can_export": rp.can_export,
            }
        })

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@require_admin
def audit_logs_api(request):
    """
    GET: Filterable audit log entries with metadata, pagination and summary statistics.
    """
    qs = AuditLog.objects.all().order_by("-created_at")

    # Filters
    search = request.GET.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(actor_username__icontains=search) |
            Q(action__icontains=search) |
            Q(resource__icontains=search) |
            Q(resource_id__icontains=search) |
            Q(ip_address__icontains=search)
        )

    action_filter = request.GET.get("action", "").strip()
    if action_filter and action_filter != "ALL":
        qs = qs.filter(action=action_filter)

    role_filter = request.GET.get("role", "").strip()
    if role_filter and role_filter != "ALL":
        qs = qs.filter(actor_role=role_filter)

    # Date range
    start_date = request.GET.get("start_date", "").strip()
    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)

    end_date = request.GET.get("end_date", "").strip()
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)

    # Quick audit stats
    today = timezone.localdate()
    total_logs = AuditLog.objects.count()
    today_logins = AuditLog.objects.filter(action=AuditLog.Actions.USER_LOGIN, created_at__date=today).count()
    today_actions = AuditLog.objects.filter(created_at__date=today).count()
    security_alerts = AuditLog.objects.filter(action__in=[AuditLog.Actions.ACCESS_DENIED, AuditLog.Actions.LOGIN_FAILED]).count()

    # Pagination
    page_num = int(request.GET.get("page", 1))
    page_size = min(int(request.GET.get("page_size", 20)), 100)
    paginator = Paginator(qs, page_size)
    page = paginator.get_page(page_num)

    logs_list = [{
        "id": l.id,
        "actor": {
            "id": l.actor.id if l.actor else None,
            "username": l.actor_username,
            "role": l.actor_role,
        },
        "action": l.action,
        "resource": l.resource,
        "resource_id": l.resource_id,
        "details": l.details,
        "ip_address": l.ip_address or "127.0.0.1",
        "user_agent": l.user_agent,
        "timestamp": l.created_at.strftime("%d %b %Y, %H:%M:%S"),
        "date": l.created_at.strftime("%Y-%m-%d"),
    } for l in page.object_list]

    return JsonResponse({
        "success": True,
        "logs": logs_list,
        "stats": {
            "total_logs": total_logs,
            "today_logins": today_logins,
            "today_actions": today_actions,
            "security_alerts": security_alerts,
        },
        "pagination": {
            "page": page.number,
            "page_size": page_size,
            "total_records": paginator.count,
            "total_pages": paginator.num_pages,
            "has_next": page.has_next(),
            "has_previous": page.has_previous(),
        }
    })
