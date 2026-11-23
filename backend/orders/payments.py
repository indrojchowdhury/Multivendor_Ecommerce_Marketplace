import json
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from django.conf import settings


class PaymentGatewayError(Exception):
    pass


class PaymentValidationError(PaymentGatewayError):
    pass


def _gateway_url(path):
    if settings.SSLCOMMERZ_IS_SANDBOX:
        host = "https://sandbox.sslcommerz.com"
    else:
        host = "https://securepay.sslcommerz.com"

    return f"{host}{path}"


def _credentials():
    store_id = settings.SSLCOMMERZ_STORE_ID
    store_password = settings.SSLCOMMERZ_STORE_PASSWORD

    if not store_id or not store_password:
        raise PaymentGatewayError(
            "SSLCommerz credentials are not configured."
        )

    return store_id, store_password


def _store_id_matches(response_store_id, store_id):
    """
    Live mode: response store_id must exactly match our store_id.
    Sandbox mode: SSLCommerz often returns "testbox" instead of the
    real sandbox store_id, so we accept that too (sandbox only).
    """
    if response_store_id in (None, ""):
        return True

    if response_store_id == store_id:
        return True

    return bool(
        settings.SSLCOMMERZ_IS_SANDBOX
        and response_store_id == "testbox"
    )


def _callback_base_url():
    base_url = getattr(
        settings,
        "SSLCOMMERZ_CALLBACK_BASE_URL",
        "",
    )

    if not base_url:
        raise PaymentGatewayError(
            "SSLCommerz public callback URL is not configured."
        )

    parsed = urlparse(base_url)

    if parsed.scheme != "https" or not parsed.hostname:
        raise PaymentGatewayError(
            "SSLCommerz callback URL must be a valid HTTPS URL."
        )

    return base_url.rstrip("/")


def _post_form(url, payload):
    request = Request(
        url,
        data=urlencode(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

    except (
        HTTPError,
        URLError,
        TimeoutError,
        json.JSONDecodeError,
    ) as error:
        raise PaymentGatewayError(
            "Could not communicate with SSLCommerz."
        ) from error

    if not isinstance(data, dict):
        raise PaymentGatewayError(
            "SSLCommerz returned an invalid response."
        )

    return data


def initiate_payment(order, transaction, request):
    store_id, store_password = _credentials()

    callback_base = (
        f"{_callback_base_url()}/api/orders/payments"
    )

    ipn_url = getattr(
        settings,
        "SSLCOMMERZ_IPN_URL",
        "",
    ) or f"{callback_base}/ipn/"

    shipping = order.shipping_address

    payload = {
        "store_id": store_id,
        "store_passwd": store_password,
        "total_amount": f"{order.total:.2f}",
        "currency": "BDT",
        "tran_id": str(transaction.transaction_id),

        "success_url": f"{callback_base}/success/",
        "fail_url": f"{callback_base}/failure/",
        "cancel_url": f"{callback_base}/cancel/",
        "ipn_url": ipn_url,

        "shipping_method": "NO",
        "product_name": ", ".join(
            item["name"] for item in order.items
        )[:255],
        "product_category": "Marketplace",
        "product_profile": "general",

        "cus_name": shipping["fullName"],
        "cus_email": order.user.email,
        "cus_add1": shipping["address"][:100],
        "cus_city": shipping["district"][:50],
        "cus_country": "Bangladesh",
        "cus_phone": shipping["phone"],
    }

    response = _post_form(
        _gateway_url("/gwprocess/v4/api.php"),
        payload,
    )

    payment_url = response.get("GatewayPageURL")

    if response.get("status") != "SUCCESS" or not payment_url:
        raise PaymentGatewayError(
            response.get("failedreason")
            or "SSLCommerz could not start payment."
        )

    expected_host = (
        "sandbox.sslcommerz.com"
        if settings.SSLCOMMERZ_IS_SANDBOX
        else "securepay.sslcommerz.com"
    )

    parsed_url = urlparse(payment_url)

    if (
        parsed_url.scheme != "https"
        or parsed_url.hostname != expected_host
    ):
        raise PaymentGatewayError(
            "SSLCommerz returned an unexpected payment URL."
        )

    return payment_url


def validate_payment(transaction, validation_id):
    store_id, store_password = _credentials()

    query = urlencode({
        "val_id": validation_id,
        "store_id": store_id,
        "store_passwd": store_password,
        "format": "json",
    })

    validation_url = _gateway_url(
        f"/validator/api/validationserverAPI.php?{query}"
    )

    request = Request(validation_url)

    try:
        with urlopen(request, timeout=30) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

    except (
        HTTPError,
        URLError,
        TimeoutError,
        json.JSONDecodeError,
    ) as error:
        raise PaymentGatewayError(
            "Could not validate payment with SSLCommerz."
        ) from error

    if not isinstance(data, dict):
        raise PaymentGatewayError(
            "SSLCommerz returned an invalid validation response."
        )

    expected_amount = Decimal(str(transaction.order.total))

    try:
        received_amount = Decimal(str(data.get("amount", "0")))
        amount_matches = received_amount == expected_amount

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        received_amount = None
        amount_matches = False

    store_id_ok = _store_id_matches(data.get("store_id"), store_id)
    tran_id_ok = data.get("tran_id") == str(transaction.transaction_id)

    if (
        data.get("status") not in ("VALID", "VALIDATED")
        or not store_id_ok
        or not tran_id_ok
        or data.get("currency") != "BDT"
        or not amount_matches
    ):
        raise PaymentValidationError(
            "SSLCommerz payment validation did not match the order."
        )

    return data