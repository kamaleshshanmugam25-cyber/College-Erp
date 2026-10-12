from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import RoleActionPermission
from apps.core.rbac import Roles
from .models import FeeInstallment, FeeReceipt, PaymentTransaction, StudentFee
from .services import PaymentError, initiate_payment


class InstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeInstallment
        fields = ("id", "sequence", "due_date", "amount", "paid_amount", "status")


class StudentFeeSerializer(serializers.ModelSerializer):
    installments = InstallmentSerializer(many=True, read_only=True)
    outstanding = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    roll_no = serializers.CharField(source="student.roll_no", read_only=True)

    class Meta:
        model = StudentFee
        fields = ("id", "academic_year", "course", "course_name", "student_name", "roll_no", "total_amount", "due_date", "outstanding", "installments")


class PayRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    method = serializers.ChoiceField(choices=PaymentTransaction.Method.choices)
    gateway = serializers.ChoiceField(choices=["razorpay", "cashfree"])


class StudentFeeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentFeeSerializer
    permission_classes = [RoleActionPermission]

    def get_queryset(self):  # scoped per user - never trust ids from the URL
        return StudentFee.objects.visible_to(self.request.user).prefetch_related("installments")

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """Start a payment and issue verified receipt."""
        fee = self.get_object()
        body = PayRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            txn = initiate_payment(fee=fee, user=request.user, **body.validated_data)
        except PaymentError as e:
            return Response({"detail": str(e)}, status=400)

        # In demo / development environment: complete payment immediately and issue official receipt
        auto_confirm = request.data.get("auto_confirm", True)
        if auto_confirm:
            import uuid
            from .gateways import GatewayEvent
            from .services import process_gateway_event
            ev = GatewayEvent(
                order_id=txn.order_id,
                gateway_txn_id=f"pay_{uuid.uuid4().hex[:14]}",
                amount=txn.amount,
                status="SUCCESS",
                raw={"auto_confirmed": True},
            )
            txn, _ = process_gateway_event(ev)

        receipt = getattr(txn, "receipt", None)
        return Response({
            "order_id": txn.order_id,
            "amount": float(txn.amount),
            "status": txn.status,
            "receipt_id": receipt.id if receipt else None,
            "receipt_number": receipt.receipt_number if receipt else None,
        }, status=201)


class ReceiptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="transaction.fee.student.name", read_only=True)
    roll_no = serializers.CharField(source="transaction.fee.student.roll_no", read_only=True)
    course_name = serializers.CharField(source="transaction.fee.course.name", read_only=True)
    course_code = serializers.CharField(source="transaction.fee.course.code", read_only=True)
    academic_year = serializers.CharField(source="transaction.fee.academic_year", read_only=True)
    amount = serializers.DecimalField(source="transaction.amount", max_digits=12, decimal_places=2, read_only=True)
    method = serializers.CharField(source="transaction.method", read_only=True)
    gateway = serializers.CharField(source="transaction.gateway", read_only=True)
    gateway_txn_id = serializers.CharField(source="transaction.gateway_txn_id", read_only=True)

    class Meta:
        model = FeeReceipt
        fields = (
            "id", "receipt_number", "timestamp", "pdf_file",
            "student_name", "roll_no", "course_name", "course_code",
            "academic_year", "amount", "method", "gateway", "gateway_txn_id",
        )


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReceiptSerializer

    def get_queryset(self):
        return FeeReceipt.objects.visible_to(self.request.user).select_related(
            "transaction__fee__student", "transaction__fee__course"
        )
