"""Role definitions and helpers. Kept free of model imports so models can use it."""


class Roles:
    SUPER_ADMIN = "Super Admin"
    FINANCE_ADMIN = "Finance Admin"
    FINANCE_USER = "Finance User"
    ACCOUNTANT = "Accountant"
    FEE_MANAGER = "Fee Manager"
    HR_ADMIN = "HR Admin"
    EMPLOYEE = "Employee"
    STUDENT_PARENT = "Student/Parent"

    ALL = (
        SUPER_ADMIN,
        FINANCE_ADMIN,
        FINANCE_USER,
        ACCOUNTANT,
        HR_ADMIN,
        EMPLOYEE,
        STUDENT_PARENT,
    )

    FINANCE_ROLES = (
        SUPER_ADMIN,
        FINANCE_ADMIN,
        FINANCE_USER,
        ACCOUNTANT,
    )


# role -> permission strings. "app.*" = every permission in the app, "*" = everything.
ROLE_PERMISSIONS = {
    Roles.SUPER_ADMIN: ["*"],
    Roles.FINANCE_ADMIN: ["fees.*", "ledger.*", "core.*"],
    Roles.FINANCE_USER: ["fees.view_studentfee", "fees.view_course"],
    Roles.ACCOUNTANT: ["fees.view_feereceipt", "fees.add_feereceipt", "fees.view_studentfee",
                       "fees.change_studentfee", "ledger.view_generalledger", "ledger.add_journalvoucher"],
    Roles.HR_ADMIN: ["hr.*"],
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


def primary_role(user) -> str:
    """Returns the primary role title for display and audit logging."""
    if not getattr(user, "is_authenticated", False):
        return "Anonymous"
    roles = user_roles(user)
    if Roles.SUPER_ADMIN in roles:
        return Roles.SUPER_ADMIN
    if Roles.FINANCE_ADMIN in roles:
        return Roles.FINANCE_ADMIN
    if Roles.FINANCE_USER in roles:
        return Roles.FINANCE_USER
    if Roles.ACCOUNTANT in roles:
        return Roles.ACCOUNTANT
    if Roles.FEE_MANAGER in roles:
        return Roles.FEE_MANAGER
    if Roles.HR_ADMIN in roles:
        return Roles.HR_ADMIN
    if Roles.EMPLOYEE in roles:
        return Roles.EMPLOYEE
    if Roles.STUDENT_PARENT in roles:
        return Roles.STUDENT_PARENT
    return list(roles)[0] if roles else "User"


def has_role(user, *roles) -> bool:
    mine = user_roles(user)
    return Roles.SUPER_ADMIN in mine or any(r in mine for r in roles)
