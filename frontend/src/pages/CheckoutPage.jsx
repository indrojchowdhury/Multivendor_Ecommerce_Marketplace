import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FormField from "../components/auth/FormField";
import PaymentMethodSelector from "../components/checkout/PaymentMethodSelector";
import SelectField from "../components/checkout/SelectField";
import { DISTRICTS, getShippingFee } from "../constants/checkout";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder } from "../api/orders";

const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/;

function formatPrice(value) {
  return `৳${value.toLocaleString("en-US")}`;
}

function CheckoutPage() {
  const { user } = useAuth();
  const { cartItems, totalItems, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    district: "",
    area: "",
    address: "",
    note: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // An empty cart has nothing to check out, unless the order was just placed.
  if (cartItems.length === 0 && !orderPlaced) {
    return <Navigate to="/cart" replace />;
  }

  const shippingFee = getShippingFee(form.district);
  const total = subtotal + shippingFee;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function validate() {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Enter the recipient's full name.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Enter a phone number.";
    } else if (!PHONE_PATTERN.test(form.phone.trim())) {
      nextErrors.phone = "Enter a valid mobile number, for example 01712345678.";
    }

    if (!form.district) {
      nextErrors.district = "Select a district.";
    }

    if (!form.area.trim()) {
      nextErrors.area = "Enter your area or thana.";
    }

    if (!form.address.trim()) {
      nextErrors.address = "Enter your full address.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      document
        .getElementById(Object.keys(nextErrors)[0])
        ?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const order = await createOrder({
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          district: form.district,
          area: form.area.trim(),
          address: form.address.trim(),
          note: form.note.trim(),
        },
        paymentMethod,
      });

      if (order.paymentUrl) {
        window.location.assign(order.paymentUrl);
        return;
      }

      setOrderPlaced(true);
      clearCart();
      navigate(`/order-confirmation/${order.id}`, { replace: true });
    } catch (error) {
      setSubmitError(error.message || "Something went wrong while placing your order. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
        <p className="mt-2 text-slate-600">
          Enter your delivery details and choose how you want to pay.
        </p>

        {submitError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"
        >
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Shipping address</h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField
                  id="fullName"
                  label="Full name"
                  value={form.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                  autoComplete="name"
                />

                <FormField
                  id="phone"
                  label="Phone number"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  placeholder="01712345678"
                  autoComplete="tel"
                />

                <SelectField
                  id="district"
                  label="District"
                  value={form.district}
                  onChange={handleChange}
                  options={DISTRICTS}
                  error={errors.district}
                  placeholder="Select district"
                />

                <FormField
                  id="area"
                  label="Area / Thana"
                  value={form.area}
                  onChange={handleChange}
                  error={errors.area}
                  placeholder="For example, Mirpur"
                />

                <div className="sm:col-span-2">
                  <FormField
                    id="address"
                    label="Full address"
                    value={form.address}
                    onChange={handleChange}
                    error={errors.address}
                    placeholder="House, road, block"
                    autoComplete="street-address"
                  />
                </div>

                <div className="sm:col-span-2">
                  <FormField
                    id="note"
                    label="Delivery note (optional)"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Anything the courier should know"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Payment method</h2>

              <div className="mt-5">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Order summary</h2>

              <Link
                to="/cart"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Edit cart
              </Link>
            </div>

            <ul className="mt-5 space-y-4">
              {cartItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                  </div>

                  <p className="text-sm font-semibold text-slate-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">
                  Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
                </dt>
                <dd className="font-medium text-slate-900">{formatPrice(subtotal)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery</dt>
                <dd className="font-medium text-slate-900">
                  {form.district ? formatPrice(shippingFee) : "Select district"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-between border-t border-slate-200 pt-5">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-slate-900">
                {formatPrice(total)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Delivery is ৳60 inside Dhaka and ৳120 elsewhere.
            </p>
          </aside>
        </form>
      </div>
    </section>
  );
}

export default CheckoutPage;