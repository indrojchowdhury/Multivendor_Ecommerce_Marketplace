import { Check, LogOut, Package, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormField from "../components/auth/FormField";
import { useAuth } from "../context/AuthContext";
import { clearOrderHistory, getOrders } from "../api/orders";
import { rateProduct } from "../api/products";

const STATUS_STYLES = {
  Processing: "bg-amber-50 text-amber-700",
  Shipped: "bg-sky-50 text-sky-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

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

function OrderItemRating({ item }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const alreadyRated = item.has_review || saved;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await rateProduct(item.id, { rating, comment, imageFile });
      setSaved(true);
      setIsOpen(false);
    } catch (requestError) {
      console.error("Failed to submit order rating:", requestError);
      setError(requestError.message || "Could not save your rating.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2">
      {alreadyRated ? (
        <p role="status" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
          <Check size={15} />
          Rating submitted
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          <Star size={15} />
          Rate this product
        </button>
      )}

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 max-w-md space-y-3 rounded-xl border border-slate-200 p-3"
        >
          <label className="block text-xs font-medium text-slate-700">
            Rating
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Review (optional)
            <textarea
              rows={2}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Share your experience"
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Product photo (optional, JPG/PNG up to 5 MB)
            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (file && !["image/jpeg", "image/png"].includes(file.type)) {
                  setImageFile(null);
                  setError("Choose a JPG or PNG image.");
                  event.target.value = "";
                  return;
                }
                if (file && file.size > 5 * 1024 * 1024) {
                  setImageFile(null);
                  setError("Image files must be 5 MB or smaller.");
                  event.target.value = "";
                  return;
                }
                setImageFile(file);
                setError("");
              }}
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
            />
          </label>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit rating"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ProfileDetails({ user, updateProfile }) {
  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (user.role === "seller" && !companyName.trim()) {
      setError("Enter your company or store name.");
      return;
    }

    try {
      await updateProfile({
        name: name.trim(),
        ...(user.role === "seller" ? { companyName: companyName.trim() } : {}),
      });
      setError("");
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Could not save your profile.");
      setSaved(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-5">
      <FormField
        id="profile-name"
        label="Full name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError("");
          setSaved(false);
        }}
        error={error}
        autoComplete="name"
      />

      {user.role === "seller" && (
        <FormField
          id="profile-company-name"
          label="Company / Store name"
          value={companyName}
          onChange={(event) => {
            setCompanyName(event.target.value);
            setError("");
            setSaved(false);
          }}
          error={error}
          autoComplete="organization"
        />
      )}

      <FormField
        id="profile-email"
        label="Email"
        type="email"
        value={user.email}
        onChange={() => {}}
        readOnly
        hint="Your email cannot be changed."
      />

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
        >
          Save changes
        </button>

        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-600">
            Changes saved
          </p>
        )}
      </div>
    </form>
  );
}

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to load orders:", requestError);
          setError(requestError.message || "Could not load your orders.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClearHistory() {
    if (
      !window.confirm(
        "Clear your order history from this account? Orders will be hidden here but retained for sellers and records."
      )
    ) {
      return;
    }

    setClearing(true);
    setError("");
    try {
      await clearOrderHistory();
      setOrders([]);
    } catch (requestError) {
      console.error("Failed to clear order history:", requestError);
      setError(requestError.message || "Could not clear your order history.");
    } finally {
      setClearing(false);
    }
  }

  if (error) {
    return <p role="alert" className="text-sm text-red-600">{error}</p>;
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
        <Package size={36} className="mx-auto text-slate-400" />

        <h3 className="mt-3 text-lg font-semibold text-slate-900">
          No orders yet
        </h3>

        <p className="mt-2 text-slate-600">
          Orders you place will show up here.
        </p>

        <Link
          to="/"
          className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleClearHistory}
          disabled={clearing}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 size={16} />
          {clearing ? "Clearing..." : "Clear order history"}
        </button>
      </div>
      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{order.id}</p>
                <p className="text-sm text-slate-500">{formatDate(order.date)}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[order.status] || STATUS_STYLES.Processing
                }`}
              >
                {order.status}
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.id}`}
                      className="truncate font-medium text-slate-900 hover:text-orange-700"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                    {item.status === "Delivered" && (
                      <OrderItemRating item={item} />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-600">Total</span>
              <span className="font-bold text-slate-900">{formatPrice(order.total)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.tab === "orders" &&
      (user.role === "customer" || user.role === "admin")
      ? "orders"
      : "profile"
  );

  function handleLogout() {
    logout();
    navigate("/");
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    ...(user.role === "customer" || user.role === "admin"
      ? [{ id: "orders", label: "Order History" }]
      : []),
  ];

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-xl font-bold text-white"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
          <div role="tablist" className="flex gap-2 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6" role="tabpanel">
            {activeTab === "profile" ? (
              <ProfileDetails user={user} updateProfile={updateProfile} />
            ) : (
              <OrderHistory />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;