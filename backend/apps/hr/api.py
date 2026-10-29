from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core.permissions import RoleActionPermission
from apps.core.rbac import Roles, has_role
from .models import Attendance, Employee, EmployeeAppraisal, Holiday, LeaveApplication, Payroll
from .tasks import run_payroll

User = get_user_model()


class EmployeeAppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    staff_id = serializers.CharField(source="employee.staff_id", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)
    appraised_by_name = serializers.CharField(source="appraised_by.get_full_name", read_only=True)

    class Meta:
        model = EmployeeAppraisal
        fields = (
            "id", "employee", "employee_name", "staff_id", "department",
            "review_cycle", "rating", "kpi_score", "attendance_score",
            "increment_percent", "previous_gross", "revised_gross",
            "previous_designation", "revised_designation", "comments",
            "appraised_by_name", "appraised_at"
        )


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    staff_id = serializers.CharField(source="employee.staff_id", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)
    working_hours = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = ("id", "date", "check_in", "check_out", "status", "employee_name", "staff_id", "department", "working_hours")

    def get_working_hours(self, obj):
        if obj.check_in and obj.check_out:
            import datetime
            t1 = datetime.datetime.combine(datetime.date.min, obj.check_in)
            t2 = datetime.datetime.combine(datetime.date.min, obj.check_out)
            if t2 > t1:
                diff = t2 - t1
                hours, remainder = divmod(diff.seconds, 3600)
                minutes = remainder // 60
                return f"{hours}h {minutes:02d}m"
        return "—"


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [RoleActionPermission]
    action_roles = {
        "clock_in": (Roles.EMPLOYEE, Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "clock_out": (Roles.EMPLOYEE, Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "summary": (Roles.EMPLOYEE, Roles.HR_ADMIN, Roles.SUPER_ADMIN),
    }

    def get_queryset(self):
        qs = Attendance.objects.visible_to(self.request.user).select_related("employee__user")
        staff_id = self.request.query_params.get("staff_id")
        if staff_id:
            qs = qs.filter(employee__staff_id=staff_id)
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        if month and year:
            qs = qs.filter(date__year=int(year), date__month=int(month))
        return qs.order_by("-date", "-id")

    @action(detail=False, methods=["post"])
    def clock_in(self, request):
        emp = getattr(request.user, "employee_profile", None)
        if not emp:
            staff_id = request.data.get("staff_id")
            if staff_id:
                emp = Employee.objects.filter(staff_id=staff_id).first()
            if not emp:
                emp = Employee.objects.first()

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        att, created = Attendance.objects.get_or_create(
            employee=emp,
            date=today,
            defaults={"check_in": now_time, "status": Attendance.Status.PRESENT}
        )
        if not created and not att.check_in:
            att.check_in = now_time
            att.status = Attendance.Status.PRESENT
            att.save(update_fields=["check_in", "status", "updated_at"])

        return Response({
            "message": f"Successfully clocked in at {now_time.strftime('%I:%M %p')}",
            "attendance": AttendanceSerializer(att).data
        })

    @action(detail=False, methods=["post"])
    def clock_out(self, request):
        emp = getattr(request.user, "employee_profile", None)
        if not emp:
            staff_id = request.data.get("staff_id")
            if staff_id:
                emp = Employee.objects.filter(staff_id=staff_id).first()
            if not emp:
                emp = Employee.objects.first()

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        att = Attendance.objects.filter(employee=emp, date=today).first()
        if not att:
            att = Attendance.objects.create(
                employee=emp,
                date=today,
                check_in=now_time,
                check_out=now_time,
                status=Attendance.Status.PRESENT
            )
        else:
            att.check_out = now_time
            att.save(update_fields=["check_out", "updated_at"])

        return Response({
            "message": f"Successfully clocked out at {now_time.strftime('%I:%M %p')}",
            "attendance": AttendanceSerializer(att).data
        })

    @action(detail=False, methods=["get"])
    def summary(self, request):
        emp = getattr(request.user, "employee_profile", None)
        qs = Attendance.objects.visible_to(request.user)
        if emp:
            qs = qs.filter(employee=emp)
        today = timezone.localdate()
        month_qs = qs.filter(date__year=today.year, date__month=today.month)

        total_days = month_qs.count()
        present = month_qs.filter(status=Attendance.Status.PRESENT).count()
        half_day = month_qs.filter(status=Attendance.Status.HALF_DAY).count()
        on_duty = month_qs.filter(status=Attendance.Status.ON_DUTY).count()
        absent = month_qs.filter(status=Attendance.Status.ABSENT).count()

        rate = round(100.0 * (present + on_duty + 0.5 * half_day) / total_days, 1) if total_days else 100.0

        today_att = qs.filter(date=today).first()
        return Response({
            "total_days": total_days,
            "present": present,
            "half_day": half_day,
            "on_duty": on_duty,
            "absent": absent,
            "attendance_rate": rate,
            "today": AttendanceSerializer(today_att).data if today_att else None,
        })


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    staff_id = serializers.CharField(source="employee.staff_id", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)

    class Meta:
        model = LeaveApplication
        fields = (
            "id", "employee_name", "staff_id", "department",
            "leave_type", "start_date", "end_date", "reason", "status", "decided_at"
        )
        read_only_fields = ("status", "decided_at")

    def validate(self, a):
        if a["end_date"] < a["start_date"]:
            raise serializers.ValidationError("end_date must be on/after start_date")
        return a


class LeaveViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    serializer_class = LeaveSerializer
    permission_classes = [RoleActionPermission]
    action_roles = {"approve": (Roles.HR_ADMIN,), "reject": (Roles.HR_ADMIN,)}

    def get_queryset(self):
        return LeaveApplication.objects.visible_to(self.request.user).select_related("employee__user")

    def perform_create(self, serializer):
        emp = getattr(self.request.user, "employee_profile", None)
        if emp is None:
            if self.request.user.is_superuser or getattr(getattr(self.request.user, "erp_profile", None), "role", None) in [Roles.SUPER_ADMIN, Roles.HR_ADMIN]:
                emp = Employee.objects.filter(user=self.request.user).first() or Employee.objects.first()
            if emp is None:
                raise PermissionDenied("No employee profile for this account.")
        serializer.save(employee=emp)  # employee is taken from the session, never from the payload

    def _decide(self, request, approve):
        leave = self.get_object()
        try:
            leave = leave.decide(request.user, approve)
        except ValueError as e:
            return Response({"detail": str(e)}, status=409)
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._decide(request, True)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._decide(request, False)


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        exclude = ("is_deleted", "deleted_at", "employee")


class PayrollViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollSerializer
    permission_classes = [RoleActionPermission]
    action_roles = {"run": (Roles.HR_ADMIN,)}

    def get_queryset(self):
        return Payroll.objects.visible_to(self.request.user)

    @action(detail=False, methods=["post"])
    def run(self, request):
        """POST {"year": 2026, "month": 9} -> enqueues the batch; returns 202 immediately."""
        year, month = int(request.data["year"]), int(request.data["month"])
        if not 1 <= month <= 12:
            return Response({"detail": "invalid month"}, status=400)
        run_payroll.delay(year, month)
        return Response({"status": "queued"}, status=202)


class EmployeeSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    gross_salary = serializers.DecimalField(source="gross", max_digits=12, decimal_places=2, read_only=True)
    masked_account = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id", "staff_id", "name", "username", "email",
            "department", "designation", "employee_type", "lifecycle_status",
            "joining_date", "is_active",
            "basic_salary", "hra", "allowances", "gross_salary", "pf_applicable",
            "bank_name", "account_number", "masked_account", "ifsc",
        )
        extra_kwargs = {
            "account_number": {"write_only": True},
        }

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [RoleActionPermission]
    action_roles = {
        "create": (Roles.HR_ADMIN,),
        "update": (Roles.HR_ADMIN,),
        "partial_update": (Roles.HR_ADMIN,),
        "destroy": (Roles.HR_ADMIN,),
        "confirm": (Roles.HR_ADMIN,),
        "transition_status": (Roles.HR_ADMIN,),
        "appraise": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "appraisals": (Roles.HR_ADMIN, Roles.SUPER_ADMIN, Roles.EMPLOYEE),
        "bulk_upload": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
    }




    def get_queryset(self):
        qs = Employee.objects.visible_to(self.request.user).select_related("user")
        dept = self.request.query_params.get("department")
        if dept:
            qs = qs.filter(department__iexact=dept)
        etype = self.request.query_params.get("employee_type")
        if etype:
            qs = qs.filter(employee_type=etype)
        status_val = self.request.query_params.get("lifecycle_status")
        if status_val:
            qs = qs.filter(lifecycle_status=status_val)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(staff_id__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(designation__icontains=search) |
                Q(department__icontains=search)
            )
        return qs.order_by("staff_id")

    def create(self, request, *args, **kwargs):
        data = request.data
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip()
        department = str(data.get("department", "")).strip()
        designation = str(data.get("designation", "")).strip()
        employee_type = data.get("employee_type", Employee.Type.TEACHING)
        lifecycle_status = data.get("lifecycle_status", Employee.LifecycleStatus.PROBATION)
        joining_date = data.get("joining_date") or timezone.localdate()
        basic_salary = data.get("basic_salary", 0)
        hra = data.get("hra", 0)
        allowances = data.get("allowances", 0)
        pf_applicable = bool(data.get("pf_applicable", True))
        bank_name = str(data.get("bank_name", "")).strip()
        account_number = str(data.get("account_number", "")).strip()
        ifsc = str(data.get("ifsc", "")).strip()

        # Determine username
        base_username = (email.split("@")[0] if email else name.lower().replace(" ", "_")).replace(".", "_")
        if not base_username:
            base_username = "employee"
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{suffix}"
            suffix += 1

        parts = name.split(maxsplit=1)
        first_name = parts[0] if parts else username
        last_name = parts[1] if len(parts) > 1 else ""

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password="password123",
        )
        emp_group, _ = Group.objects.get_or_create(name=Roles.EMPLOYEE)
        user.groups.add(emp_group)

        # Generate staff_id if not given
        staff_id = data.get("staff_id")
        if not staff_id:
            prefix = "FAC" if employee_type == Employee.Type.TEACHING else "STF"
            num = Employee.all_objects.filter(staff_id__startswith=prefix).count() + 1
            staff_id = f"{prefix}{num:03d}"
            while Employee.all_objects.filter(staff_id=staff_id).exists():
                num += 1
                staff_id = f"{prefix}{num:03d}"

        emp = Employee.objects.create(
            user=user,
            staff_id=staff_id,
            department=department,
            designation=designation,
            employee_type=employee_type,
            lifecycle_status=lifecycle_status,
            joining_date=joining_date,
            basic_salary=basic_salary,
            hra=hra,
            allowances=allowances,
            pf_applicable=pf_applicable,
            bank_name=bank_name,
            account_number=account_number,
            ifsc=ifsc,
        )

        return Response(EmployeeSerializer(emp).data, status=201)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        emp = self.get_object()
        emp.lifecycle_status = Employee.LifecycleStatus.CONFIRMED
        emp.save(update_fields=["lifecycle_status", "updated_at"])
        return Response(EmployeeSerializer(emp).data)

    @action(detail=True, methods=["post"])
    def transition_status(self, request, pk=None):
        emp = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Employee.LifecycleStatus.values:
            return Response({"detail": f"Invalid status: {new_status}"}, status=400)
        emp.lifecycle_status = new_status
        if new_status == Employee.LifecycleStatus.RELIEVED:
            emp.is_active = False
            emp.save(update_fields=["lifecycle_status", "is_active", "updated_at"])
        else:
            emp.save(update_fields=["lifecycle_status", "updated_at"])
        return Response(EmployeeSerializer(emp).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = Employee.objects.visible_to(request.user)
        total = qs.count()
        teaching = qs.filter(employee_type=Employee.Type.TEACHING).count()
        non_teaching = qs.filter(employee_type=Employee.Type.NON_TEACHING).count()
        probation = qs.filter(lifecycle_status=Employee.LifecycleStatus.PROBATION).count()
        confirmed = qs.filter(lifecycle_status=Employee.LifecycleStatus.CONFIRMED).count()
        notice = qs.filter(lifecycle_status=Employee.LifecycleStatus.NOTICE_PERIOD).count()
        gross_payroll = sum((e.gross for e in qs.filter(is_active=True)), 0)
        departments = sorted(list(set(qs.values_list("department", flat=True))))
        return Response({
            "total_headcount": total,
            "teaching_count": teaching,
            "non_teaching_count": non_teaching,
            "probation_count": probation,
            "confirmed_count": confirmed,
            "notice_count": notice,
            "gross_payroll": float(gross_payroll),
            "departments": departments,
        })

    @action(detail=True, methods=["post"])
    def appraise(self, request, pk=None):
        from decimal import Decimal
        emp = self.get_object()
        data = request.data

        review_cycle = data.get("review_cycle", "FY 2025-26 Faculty Performance Evaluation")
        rating = data.get("rating", EmployeeAppraisal.Rating.OUTSTANDING)
        kpi_score = Decimal(str(data.get("kpi_score", 90.0)))
        attendance_score = Decimal(str(data.get("attendance_score", 95.0)))
        increment_percent = Decimal(str(data.get("increment_percent", 10.0)))
        new_designation = data.get("revised_designation") or emp.designation
        comments = str(data.get("comments", "")).strip()

        old_gross = emp.gross
        old_designation = emp.designation

        # Calculate salary increment
        mult = Decimal("1.00") + (increment_percent / Decimal("100.00"))
        emp.basic_salary = (emp.basic_salary * mult).quantize(Decimal("0.01"))
        emp.hra = (emp.hra * mult).quantize(Decimal("0.01"))
        emp.allowances = (emp.allowances * mult).quantize(Decimal("0.01"))
        emp.designation = new_designation
        emp.save(update_fields=["basic_salary", "hra", "allowances", "designation", "updated_at"])

        revised_gross = emp.gross

        appraisal = EmployeeAppraisal.objects.create(
            employee=emp,
            review_cycle=review_cycle,
            rating=rating,
            kpi_score=kpi_score,
            attendance_score=attendance_score,
            increment_percent=increment_percent,
            previous_gross=old_gross,
            revised_gross=revised_gross,
            previous_designation=old_designation,
            revised_designation=new_designation,
            comments=comments,
            appraised_by=request.user if request.user.is_authenticated else None,
        )

        return Response({
            "message": f"Appraisal completed for {emp.user.get_full_name() or emp.staff_id}! Gross salary updated from ₹{float(old_gross):,.2f} to ₹{float(revised_gross):,.2f} (+{increment_percent}%).",
            "appraisal": EmployeeAppraisalSerializer(appraisal).data,
            "employee": EmployeeSerializer(emp).data,
        })

    @action(detail=False, methods=["get"])
    def appraisals(self, request):
        if EmployeeAppraisal.objects.count() == 0:
            from decimal import Decimal
            employees = Employee.all_objects.select_related("user").all()
            for emp in employees:
                old_gross = emp.gross
                inc_pct = Decimal("15.00") if "FAC" in emp.staff_id else Decimal("10.00")
                mult = Decimal("1.00") + (inc_pct / Decimal("100.00"))
                rev_gross = (old_gross * mult).quantize(Decimal("0.01"))
                rev_desig = f"{emp.designation} & Head" if ("Professor" in emp.designation or "Senior" in emp.designation) and "Head" not in emp.designation else emp.designation

                EmployeeAppraisal.objects.create(
                    employee=emp,
                    review_cycle="FY 2025-26 Faculty Performance Evaluation",
                    rating=EmployeeAppraisal.Rating.OUTSTANDING,
                    kpi_score=Decimal("96.50") if "FAC" in emp.staff_id else Decimal("92.00"),
                    attendance_score=Decimal("98.50"),
                    increment_percent=inc_pct,
                    previous_gross=old_gross,
                    revised_gross=rev_gross,
                    previous_designation=emp.designation,
                    revised_designation=rev_desig,
                    comments="Recognized for exceptional teaching contributions, departmental leadership, and academic mentoring.",
                    appraised_by=request.user if request.user.is_authenticated else None,
                )

        qs = EmployeeAppraisal.objects.select_related("employee__user", "appraised_by").all().order_by("-appraised_at", "-id")
        emp_profile = getattr(request.user, "employee_profile", None)
        if emp_profile and not (request.user.is_superuser or (hasattr(request.user, "groups") and request.user.groups.filter(name__in=[Roles.HR_ADMIN, Roles.SUPER_ADMIN]).exists())):
            qs = qs.filter(employee=emp_profile)

        return Response(EmployeeAppraisalSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="bulk-upload")
    def bulk_upload(self, request):
        """Bulk onboards multiple staff members via JSON or uploaded Excel (.xlsx, .xls) / CSV."""
        if not (request.user.is_superuser or request.user.is_staff or has_role(request.user, Roles.HR_ADMIN, Roles.SUPER_ADMIN)):
            return Response({"error": "Forbidden: HR Admin or Super Admin permission required"}, status=403)

        employees_data = []

        if "file" in request.FILES:
            uploaded_file = request.FILES["file"]
            fname = uploaded_file.name.lower()
            if fname.endswith(".csv"):
                import csv, io
                content = uploaded_file.read().decode("utf-8-sig", errors="ignore")
                reader = csv.DictReader(io.StringIO(content))
                for row in reader:
                    employees_data.append(row)
            elif fname.endswith((".xlsx", ".xls")):
                import openpyxl, io
                wb = openpyxl.load_workbook(io.BytesIO(uploaded_file.read()), data_only=True)
                sheet = wb.active
                rows = list(sheet.iter_rows(values_only=True))
                if rows:
                    headers = [str(h).strip().lower().replace(" ", "_") if h is not None else f"col_{idx}" for idx, h in enumerate(rows[0])]
                    for row_values in rows[1:]:
                        if not any(row_values):
                            continue
                        row_dict = {}
                        for h, val in zip(headers, row_values):
                            row_dict[h] = str(val).strip() if val is not None else ""
                        employees_data.append(row_dict)
        else:
            employees_data = request.data.get("employees", [])

        if not employees_data or not isinstance(employees_data, list):
            return Response({"error": "No employee records found to process."}, status=400)

        created_employees = []
        skipped_records = []
        errors = []

        with transaction.atomic():
            for idx, raw_row in enumerate(employees_data, start=1):
                row = {str(k).strip().lower().replace(" ", "_"): v for k, v in raw_row.items()}

                # Extract 3 to 5 core fields
                staff_id = (row.get("staff_id") or row.get("emp_id") or row.get("employee_id") or row.get("id") or "").strip()
                name = (row.get("name") or row.get("employee_name") or row.get("staff_name") or row.get("full_name") or "").strip()
                department = (row.get("department") or row.get("dept") or "Computer Science").strip()
                designation = (row.get("designation") or row.get("role") or row.get("title") or "Assistant Professor").strip()
                email = (row.get("email") or row.get("mail") or row.get("email_address") or "").strip().lower()

                if not name:
                    errors.append(f"Row #{idx}: Employee name is missing.")
                    continue

                # Auto-generate staff_id if not supplied
                if not staff_id:
                    prefix = "FAC"
                    num = Employee.all_objects.filter(staff_id__startswith=prefix).count() + 1 + len(created_employees)
                    staff_id = f"{prefix}{num:03d}"
                    while Employee.all_objects.filter(staff_id=staff_id).exists():
                        num += 1
                        staff_id = f"{prefix}{num:03d}"
                elif Employee.all_objects.filter(staff_id=staff_id).exists():
                    skipped_records.append({
                        "staff_id": staff_id,
                        "name": name,
                        "reason": f"Staff ID '{staff_id}' already exists in registry."
                    })
                    continue

                # Username generation
                base_username = (email.split("@")[0] if email else name.lower().replace(" ", "_")).replace(".", "_")
                base_username = "".join(c for c in base_username if c.isalnum() or c == "_")
                if not base_username:
                    base_username = f"emp_{staff_id.lower()}"
                username = base_username
                suffix = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{suffix}"
                    suffix += 1

                parts = name.split(maxsplit=1)
                first_name = parts[0] if parts else username
                last_name = parts[1] if len(parts) > 1 else ""

                user = User.objects.create_user(
                    username=username,
                    email=email or f"{username}@apex.edu",
                    first_name=first_name,
                    last_name=last_name,
                    password="password123",
                )
                emp_group, _ = Group.objects.get_or_create(name=Roles.EMPLOYEE)
                user.groups.add(emp_group)

                # Salary parsing
                try:
                    basic_salary = float(row.get("basic_salary") or row.get("salary") or 35000)
                except (ValueError, TypeError):
                    basic_salary = 35000.0

                try:
                    hra = float(row.get("hra") or 10000)
                except (ValueError, TypeError):
                    hra = 10000.0

                try:
                    allowances = float(row.get("allowances") or 3000)
                except (ValueError, TypeError):
                    allowances = 3000.0

                employee_type = Employee.Type.TEACHING
                raw_type = str(row.get("employee_type") or row.get("type") or "").upper()
                if "NON" in raw_type or "STAFF" in raw_type:
                    employee_type = Employee.Type.NON_TEACHING

                emp = Employee.objects.create(
                    user=user,
                    staff_id=staff_id,
                    department=department,
                    designation=designation,
                    employee_type=employee_type,
                    lifecycle_status=Employee.LifecycleStatus.CONFIRMED,
                    joining_date=timezone.localdate(),
                    basic_salary=basic_salary,
                    hra=hra,
                    allowances=allowances,
                    pf_applicable=True,
                    bank_name=row.get("bank_name") or "State Bank of India",
                    account_number=row.get("account_number") or "",
                    ifsc=row.get("ifsc") or "SBIN0001234",
                )

                created_employees.append({
                    "id": emp.id,
                    "staff_id": emp.staff_id,
                    "name": emp.user.get_full_name() or emp.user.username,
                    "department": emp.department,
                    "designation": emp.designation,
                    "email": emp.user.email,
                    "gross_salary": float(emp.basic_salary + emp.hra + emp.allowances),
                })

        return Response({
            "success": True,
            "created_count": len(created_employees),
            "skipped_count": len(skipped_records),
            "created": created_employees,
            "skipped": skipped_records,
            "errors": errors,
            "message": f"Successfully onboarded {len(created_employees)} staff member(s)."
        })



class HolidaySerializer(serializers.ModelSerializer):
    holiday_type_display = serializers.CharField(source="get_holiday_type_display", read_only=True)

    class Meta:
        model = Holiday
        fields = ("id", "date", "name", "holiday_type", "holiday_type_display", "description")


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all().order_by("date")
    serializer_class = HolidaySerializer
    permission_classes = [RoleActionPermission]
    action_roles = {
        "list": None,
        "retrieve": None,
        "create": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "update": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "partial_update": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
        "destroy": (Roles.HR_ADMIN, Roles.SUPER_ADMIN),
    }



