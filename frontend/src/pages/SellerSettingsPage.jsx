import { useState } from "react";
import { Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const emptySettings = {
  name: "",
  companyName: "",
  companyDescription: "",
  contactPhone: "",
  businessAddress: "",
  shippingPolicy: "",
  shippingFee: "120.00",
  payoutMethod: "",
  payoutReference: "",
};

function SellerSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState(() => ({
    ...emptySettings,
    name: user?.name || "",
    companyName: user?.companyName || "",
    companyDescription: user?.companyDescription || "",
    contactPhone: user?.contactPhone || "",
    businessAddress: user?.businessAddress || "",
    shippingPolicy: user?.shippingPolicy || "",
    shippingFee: user?.shippingFee ?? "120.00",
    payoutMethod: user?.payoutMethod || "",
    payoutReference: user?.payoutReference || "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      await updateProfile(form);
      setMessage("Store settings saved successfully.");
    } catch (requestError) {
      console.error("Failed to save seller settings:", requestError);
      setError(requestError.message || "Could not save store settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
            Seller Center
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Store & Account Settings
          </h1>
          <p className="mt-2 text-slate-600">
            Manage your store profile, shipping information, and payout reference.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Seller name
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Store name
              <input
                name="companyName"
                required
                value={form.companyName}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Store description
            <textarea
              name="companyDescription"
              rows={3}
              value={form.companyDescription}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Contact phone
              <input
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Shipping fee (৳)
              <input
                name="shippingFee"
                type="number"
                min="0"
                step="0.01"
                value={form.shippingFee}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Business address
            <textarea
              name="businessAddress"
              rows={2}
              value={form.businessAddress}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Shipping settings and policy
            <textarea
              name="shippingPolicy"
              rows={3}
              value={form.shippingPolicy}
              onChange={handleChange}
              placeholder="Delivery areas, estimated delivery time, and return conditions"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
            />
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-semibold text-slate-900">Payout information</h2>
            <p className="mt-1 text-sm text-slate-600">
              Save a payout method and reference only. Do not enter passwords,
              PINs, card numbers, or full bank account credentials.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Payout method
                <select
                  name="payoutMethod"
                  value={form.payoutMethod}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-orange-600"
                >
                  <option value="">Select a method</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Payout reference
                <input
                  name="payoutReference"
                  maxLength={100}
                  value={form.payoutReference}
                  onChange={handleChange}
                  placeholder="Optional reference or masked identifier"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
                />
              </label>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default SellerSettingsPage;
