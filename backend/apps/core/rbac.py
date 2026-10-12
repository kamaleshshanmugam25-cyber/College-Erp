"""Role definitions and helpers. Kept free of model imports so models can use it."""


class Roles:
    SUPER_ADMIN = "Super Admin"
    FINANCE_ADMIN = "Finance Admin"
    HR_ADMIN = "HR Admin"
    EMPLOYEE = "Employee"
    STUDENT_PARENT = "Student/Parent"

    ALL = (SUPER_ADMIN, FINANCE_ADMIN, HR_ADMIN, EMPLOYEE, STUDENT_PARENT)


# role -> permission strings. "app.*" = every permission in the app, "*" = everything.
ROLE_PERMISSIONS = {
    Roles.SUPER_ADMIN: ["*"],
    Roles.FINANCE_ADMIN: ["fees.*", "ledger.*"],
    Roles.HR_ADMIN: ["hr.*"],
    # Row-level restriction for the roles below is enforced by ScopedQuerySet.visible_to(),
    # the model permission only opens the door to the endpoint.
    Roles.EMPLOYEE: ["hr.view_attendance", "hr.view_leaveapplication",
                     "hr.add_leaveapplication", "hr.view_payroll"],
    Roles.STUDENT_PARENT: ["fees.view_studentfee", "fees.view_feeinstallment",
                           "fees.view_feereceipt"],
}


def user_roles(user) -> frozenset:
    """Group names for the user, cached on the instance for the request's lifetime."""
    if not getattr(user, "is_authenticated", False):
        return frozenset()
    if not hasattr(user, "_erp_roles"):
        names = set(user.groups.values_list("name", flat=True))
        if user.is_superuser:
            names.add(Roles.SUPER_ADMIN)
        if hasattr(user, "student_profile") and not user.is_superuser:
            names.add(Roles.STUDENT_PARENT)
        if hasattr(user, "employee_profile") and not user.is_superuser:
            names.add(Roles.EMPLOYEE)
        user._erp_roles = frozenset(names)
    return user._erp_roles



def has_role(user, *roles) -> bool:
    mine = user_roles(user)
    return Roles.SUPER_ADMIN in mine or any(r in mine for r in roles)
