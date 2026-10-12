"""Gateway-specific signature verification and payload normalisation."""
import base64
import hashlib
import hmac
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class GatewayEvent:
    order_id: str
    gateway_txn_id: str
    amount: Decimal          # rupees
    status: str              # "SUCCESS" | "FAILED"
    raw: dict
    failure_reason: str = ""


def verify_razorpay(body: bytes, signature: str, secret: str) -> bool:
    """X-Razorpay-Signature = hex(HMAC_SHA256(raw_body, webhook_secret))."""
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_cashfree(body: bytes, signature: str, timestamp: str, secret: str) -> bool:
    """x-webhook-signature = base64(HMAC_SHA256(timestamp + raw_body, secret))."""
    if not secret or not signature or not timestamp:
        return False
    digest = hmac.new(secret.encode(), timestamp.encode() + body, hashlib.sha256).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature)


def parse_razorpay(payload: dict) -> Optional[GatewayEvent]:
    status = {"payment.captured": "SUCCESS", "payment.failed": "FAILED"}.get(payload.get("event"))
    if not status:
        return None  # event we don't act on (refunds, order.paid duplicates, ...)
    ent = payload["payload"]["payment"]["entity"]
    return GatewayEvent(order_id=ent["order_id"], gateway_txn_id=ent["id"],
                        amount=Decimal(ent["amount"]) / 100,  # paise -> rupees
                        status=status, raw=payload, failure_reason=ent.get("error_description") or "")


def parse_cashfree(payload: dict) -> Optional[GatewayEvent]:
    status = {"PAYMENT_SUCCESS_WEBHOOK": "SUCCESS",
              "PAYMENT_FAILED_WEBHOOK": "FAILED"}.get(payload.get("type"))
    if not status:
        return None
    data = payload["data"]
    return GatewayEvent(order_id=data["order"]["order_id"],
                        gateway_txn_id=str(data["payment"]["cf_payment_id"]),
                        amount=Decimal(str(data["payment"]["payment_amount"])),
                        status=status, raw=payload,
                        failure_reason=data["payment"].get("payment_message") or "")
