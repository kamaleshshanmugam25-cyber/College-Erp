import logging
from .models import AuditLog
from .rbac import primary_role

logger = logging.getLogger(__name__)

# Sensitive keys to redact from audit logs
SENSITIVE_KEYS = {"password", "token", "csrftoken", "sessionid", "secret", "new_password", "old_password"}


def sanitize_dict(d):
    """Recursively redacts sensitive keys from audit log metadata."""
    if not isinstance(d, dict):
        return d
    clean = {}
    for k, v in d.items():
        if any(sens in k.lower() for sens in SENSITIVE_KEYS):
            clean[k] = "******"
        elif isinstance(v, dict):
            clean[k] = sanitize_dict(v)
        elif isinstance(v, list):
            clean[k] = [sanitize_dict(item) if isinstance(item, dict) else item for item in v]
        else:
            clean[k] = v
    return clean


def log_audit(request=None, action="", resource="", resource_id=None, details=None, actor_override=None):
    """
    Records an immutable audit event in the database.
    Safe: will not crash caller if logging fails.
    """
    try:
        actor = actor_override
        if actor is None and request and hasattr(request, "user") and request.user.is_authenticated:
            actor = request.user

        actor_username = actor.username if actor else "System / Anonymous"
        actor_role = primary_role(actor) if actor else "System"

        ip_address = None
        user_agent = ""
        if request and hasattr(request, "META"):
            x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded:
                ip_address = x_forwarded.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:250]

        clean_details = sanitize_dict(details or {})

        return AuditLog.objects.create(
            actor=actor,
            actor_username=actor_username,
            actor_role=actor_role,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id is not None else None,
            details=clean_details,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as exc:
        logger.error(f"Audit log failed: {exc}", exc_info=True)
        return None
