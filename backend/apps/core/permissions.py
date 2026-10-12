from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from .rbac import has_role


class RoleRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """Django views: set `required_roles = (Roles.X, ...)`. Super Admin always passes."""
    required_roles: tuple = ()
    def test_func(self):
        return has_role(self.request.user, *self.required_roles)

    def handle_no_permission(self):
        # anonymous -> login page; signed in but wrong role -> 403
        if not self.request.user.is_authenticated:
            return redirect_to_login(self.request.get_full_path(), self.get_login_url(),
                                     self.get_redirect_field_name())
        raise PermissionDenied


class RoleActionPermission(BasePermission):
    """DRF: `action_roles = {"approve": (Roles.HR_ADMIN,)}` locks individual actions;
    actions not listed fall through to normal authenticated access (+ queryset scoping)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        roles = getattr(view, "action_roles", {}).get(getattr(view, "action", None))
        return True if roles is None else has_role(request.user, *roles)
