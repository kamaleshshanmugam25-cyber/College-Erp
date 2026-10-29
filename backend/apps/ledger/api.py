import json
from decimal import Decimal
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import RoleActionPermission
from apps.core.rbac import Roles
from .models import AccountBalance, AccountGroup, GeneralLedger, JournalVoucher, VoucherType
from .services import LedgerError, post_voucher


class GeneralLedgerSerializer(serializers.ModelSerializer):
    voucher_no = serializers.CharField(source="voucher.voucher_no", read_only=True)
    narration = serializers.CharField(source="voucher.narration", read_only=True)
    reference = serializers.CharField(source="voucher.reference", read_only=True)
    account_group_display = serializers.CharField(source="get_account_group_display", read_only=True)

    class Meta:
        model = GeneralLedger
        fields = (
            "id", "date", "voucher_no", "voucher_type", "account_group",
            "account_group_display", "debit", "credit", "running_balance",
            "narration", "reference", "created_at"
        )


class GeneralLedgerLineSerializer(serializers.ModelSerializer):
    account_group_display = serializers.CharField(source="get_account_group_display", read_only=True)

    class Meta:
        model = GeneralLedger
        fields = ("id", "account_group", "account_group_display", "debit", "credit", "running_balance")


class JournalVoucherSerializer(serializers.ModelSerializer):
    lines = GeneralLedgerLineSerializer(many=True, read_only=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()

    class Meta:
        model = JournalVoucher
        fields = ("id", "voucher_no", "voucher_type", "date", "narration", "reference", "lines", "total_debit", "total_credit", "created_at")

    def get_total_debit(self, obj):
        return sum(line.debit for line in obj.lines.all())

    def get_total_credit(self, obj):
        return sum(line.credit for line in obj.lines.all())


class GeneralLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GeneralLedgerSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    action_roles = {
        "list": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER),
        "retrieve": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER),
        "account_balances": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER),
    }

    def get_queryset(self):
        qs = GeneralLedger.objects.select_related("voucher").all()
        account_group = self.request.query_params.get("account_group")
        if account_group:
            qs = qs.filter(account_group=account_group)
        v_type = self.request.query_params.get("voucher_type")
        if v_type:
            qs = qs.filter(voucher_type=v_type)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(voucher__narration__icontains=search) | qs.filter(voucher__voucher_no__icontains=search)
        return qs.order_by("-date", "-id")

    @action(detail=False, methods=["get"])
    def account_balances(self, request):
        balances = []
        for code, label in AccountGroup.choices:
            ab = AccountBalance.objects.filter(account_group=code).first()
            bal = float(ab.balance) if ab else 0.0
            balances.append({
                "account_group": code,
                "label": label,
                "balance": bal,
            })
        return Response(balances)


class JournalVoucherViewSet(viewsets.ModelViewSet):
    queryset = JournalVoucher.objects.prefetch_related("lines").all().order_by("-date", "-id")
    serializer_class = JournalVoucherSerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    action_roles = {
        "list": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER),
        "retrieve": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT, Roles.FINANCE_USER),
        "create": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN, Roles.ACCOUNTANT),
        "update": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN),
        "partial_update": (Roles.SUPER_ADMIN, Roles.FINANCE_ADMIN),
        "destroy": (Roles.SUPER_ADMIN,),
    }


    def create(self, request, *args, **kwargs):
        data = request.data
        v_type = data.get("voucher_type", VoucherType.JOURNAL)
        narration = str(data.get("narration", "")).strip()
        reference = str(data.get("reference", "")).strip()
        date_str = data.get("date")

        from datetime import date
        post_date = date.fromisoformat(date_str) if date_str else timezone.localdate()

        lines_data = data.get("entries", [])
        if not lines_data or not isinstance(lines_data, list):
            return Response({"error": "Entries array with account_group, debit, credit is required."}, status=400)

        entries = []
        for idx, line in enumerate(lines_data):
            grp = line.get("account_group")
            dr = Decimal(str(line.get("debit", 0)))
            cr = Decimal(str(line.get("credit", 0)))
            if grp not in AccountGroup.values:
                return Response({"error": f"Invalid account group '{grp}' at line {idx+1}."}, status=400)
            entries.append((grp, dr, cr))

        try:
            voucher = post_voucher(
                voucher_type=v_type,
                entries=entries,
                date=post_date,
                narration=narration,
                reference=reference
            )
            return Response(JournalVoucherSerializer(voucher).data, status=201)
        except LedgerError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            return Response({"error": f"Voucher posting failed: {str(e)}"}, status=500)
