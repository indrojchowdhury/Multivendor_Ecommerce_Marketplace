# SSLCommerz sandbox setup

1. Copy `.env.example` to `.env`.
2. Set `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` from your SSLCommerz sandbox account.
3. Keep `SSLCOMMERZ_IS_SANDBOX=True` while testing.
4. For local testing, expose the Django backend through a trusted HTTPS tunnel and set:
   - `SSLCOMMERZ_CALLBACK_BASE_URL` to the tunnel origin only, e.g. `https://<public-backend-host>`
   - `SSLCOMMERZ_IPN_URL` to `https://<public-backend-host>/api/orders/payments/ipn/`
   Both must use the same public HTTPS host. Add the tunnel hostname to `ALLOWED_HOSTS`.
5. Run database migrations and start the backend and frontend.
6. Choose **Online payment (SSLCommerz)** at checkout. The customer is redirected to SSLCommerz; the backend validates the transaction with SSLCommerz before marking an order Paid.

The application never accepts the browser return as proof of payment. Payment success is verified server-to-server against the transaction ID, amount, currency, and store ID. Store credentials must remain in the backend `.env` and must never be placed in frontend variables.

Cash on Delivery remains available and does not use SSLCommerz. Failed or cancelled online payments cancel the order and return reserved quantities to stock.
