import json
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .payments import PaymentValidationError, validate_payment


class PaymentValidationTests(SimpleTestCase):
    def setUp(self):
        self.transaction = SimpleNamespace(
            transaction_id="abc123",
            order=SimpleNamespace(total=Decimal("1060.00")),
        )

    @override_settings(
        SSLCOMMERZ_STORE_ID="sandbox-store",
        SSLCOMMERZ_STORE_PASSWORD="sandbox-password",
        SSLCOMMERZ_IS_SANDBOX=True,
    )
    @patch("orders.payments.urlopen")
    def test_accepts_only_matching_validated_transaction(self, urlopen_mock):
        response = SimpleNamespace(
            read=lambda: json.dumps(
                {
                    "status": "VALID",
                    "store_id": "sandbox-store",
                    "tran_id": "abc123",
                    "currency": "BDT",
                    "amount": "1060.00",
                }
            ).encode("utf-8")
        )
        urlopen_mock.return_value.__enter__.return_value = response

        result = validate_payment(self.transaction, "validation-id")

        self.assertEqual(result["status"], "VALID")
        urlopen_mock.assert_called_once()

    @override_settings(
        SSLCOMMERZ_STORE_ID="sandbox-store",
        SSLCOMMERZ_STORE_PASSWORD="sandbox-password",
        SSLCOMMERZ_IS_SANDBOX=True,
    )
    @patch("orders.payments.urlopen")
    def test_rejects_amount_mismatch(self, urlopen_mock):
        response = SimpleNamespace(
            read=lambda: json.dumps(
                {
                    "status": "VALID",
                    "store_id": "sandbox-store",
                    "tran_id": "abc123",
                    "currency": "BDT",
                    "amount": "10.00",
                }
            ).encode("utf-8")
        )
        urlopen_mock.return_value.__enter__.return_value = response

        with self.assertRaises(PaymentValidationError):
            validate_payment(self.transaction, "validation-id")
