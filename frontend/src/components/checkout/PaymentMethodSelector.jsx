import { PAYMENT_METHODS } from "../../constants/checkout";

function PaymentMethodSelector({ value, onChange }) {
  const selected = PAYMENT_METHODS.find((method) => method.id === value);

  return (
    <fieldset>
      <legend className="sr-only">Payment method</legend>

      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => {
          const active = method.id === value;

          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                active
                  ? "border-orange-600 bg-orange-100/60"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={active}
                onChange={() => onChange(method.id)}
                className="mt-1 h-4 w-4 accent-orange-600"
              />

              <span>
                <span className="block font-semibold text-slate-900">
                  {method.label}
                </span>
                <span className="mt-0.5 block text-sm text-slate-600">
                  {method.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {selected?.online && (
        <p
          role="note"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          You will continue to SSLCommerz to complete your payment securely.
        </p>
      )}
    </fieldset>
  );
}

export default PaymentMethodSelector;