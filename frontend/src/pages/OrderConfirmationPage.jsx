import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPaymentMethodLabel } from "../constants/checkout";
import { getOrder } from "../api/orders";
import { useCart } from "../context/CartContext";

function formatPrice(value) {
  return `৳${value.toLocaleString("en-US")}`;
}

function formatDate(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get("payment");
  const { clearCart } = useCart();
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (
      ["failed", "failure", "cancel", "pending"].includes(paymentResult)
    ) {
      return () => {
        cancelled = true;
      };
    }

    getOrder(orderId)
      .then((data) => {
        if (!cancelled) {
          if (data.paymentStatus === "Paid") clearCart();
          setOrderResult({ orderId, order: data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load order:", error);
          setOrderResult({
            orderId,
            order: null,
            error: error.message || "Could not load this order.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearCart, orderId, paymentResult]);

  if (["failed", "failure", "cancel", "pending"].includes(paymentResult)) {
    const paymentFailed = paymentResult !== "pending";
    return (
      <section className="px-4 py-20 text-center">
        {paymentFailed ? (
          <CircleAlert size={56} className="mx-auto text-red-500" />
        ) : (
          <Clock3 size={56} className="mx-auto text-amber-500" />
        )}
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {paymentFailed
            ? "Payment was not completed"
            : "Payment is being confirmed"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-slate-600">
          {paymentFailed
            ? "No order was placed. You can return to your cart and try again."
            : "Your order will appear in your account only after payment is confirmed. Please check your order history shortly."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to={paymentFailed ? "/cart" : "/profile"}
            state={paymentFailed ? undefined : { tab: "orders" }}
            className="inline-flex rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
          >
            {paymentFailed ? "Return to cart" : "Check order history"}
          </Link>
          <Link
            to="/"
            className="inline-flex rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </section>
    );
  }

  const loading = orderResult?.orderId !== orderId;
  const order = loading ? null : orderResult.order;

  if (loading) {
    return <section className="px-4 py-20 text-center">Loading order...</section>;
  }

  if (!order) {
    return (
      <section className="px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Order not found</h1>
        <p className="mt-3 text-slate-600">
          {orderResult?.error || "We could not find this order in your account."}
        </p>
        <Link
          to="/profile"
          state={{ tab: "orders" }}
          className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          View my orders
        </Link>
      </section>
    );
  }

  const { shippingAddress } = order;

  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <CheckCircle2 size={56} className="mx-auto text-emerald-500" />

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Thank you for your order
          </h1>

          <p className="mt-2 text-slate-600">
            Your order has been placed successfully.
          </p>

          <p className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Order number:{" "}
            <span className="font-semibold text-slate-900">{order.id}</span>
          </p>
        </div>

        <div className="mt-10 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Items</h2>

            <ul className="mt-4 space-y-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <dl className="space-y-3 border-t border-slate-200 pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatPrice(order.subtotal)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd className="font-medium text-slate-900">
                {formatPrice(order.shippingFee)}
              </dd>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Delivery address
              </h2>

              <p className="mt-2 font-medium text-slate-900">
                {shippingAddress.fullName}
              </p>
              <p className="text-sm text-slate-600">{shippingAddress.phone}</p>
              <p className="mt-1 text-sm text-slate-600">
                {shippingAddress.address}, {shippingAddress.area},{" "}
                {shippingAddress.district}
              </p>

              {shippingAddress.note && (
                <p className="mt-2 text-sm text-slate-500">
                  Note: {shippingAddress.note}
                </p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Payment
              </h2>

              <p className="mt-2 font-medium text-slate-900">
                {getPaymentMethodLabel(order.paymentMethod)}
              </p>
              <p className="text-sm text-slate-600">{order.paymentStatus}</p>

              <p className="mt-3 text-sm text-slate-500">
                Placed on {formatDate(order.date)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/profile"
            state={{ tab: "orders" }}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            View my orders
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

export default OrderConfirmationPage;