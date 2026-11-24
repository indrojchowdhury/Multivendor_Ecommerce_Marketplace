
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Trash2,
  Plus,
  Package,
  Settings,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getSellerDashboard,
  cancelSellerOrder,
  updateSellerOrderStatus,
} from "../api/seller";

const statDefinitions = [
  {
    title: "Total Products",
    key: "totalProducts",
    icon: Package,
    color: "bg-orange-200 text-orange-600",
  },
  {
    title: "Total Orders",
    key: "totalOrders",
    icon: ShoppingBag,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Total Sales",
    key: "totalSales",
    icon: TrendingUp,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Customers",
    key: "customers",
    icon: Users,
    color: "bg-sky-100 text-sky-600",
  },
];

function SellerDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState("");

  useEffect(() => {
    let cancelled = false;

    getSellerDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to load seller dashboard:", requestError);
          setError(requestError.message || "Could not load dashboard data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = statDefinitions.map((stat) => ({
    ...stat,
    value:
      stat.key === "totalSales"
        ? dashboard
          ? `৳${Number(dashboard.totalSales).toLocaleString("en-US")}`
          : "—"
        : dashboard?.[stat.key] ?? "—",
  }));
  const recentOrders = dashboard?.recentOrders || [];
  const revenueSummary = dashboard?.revenueSummary || {};
  const salesTrend = dashboard?.salesTrend || [];
  const bestSellingProducts = dashboard?.bestSellingProducts || [];
  const maxDailySales = Math.max(
    1,
    ...salesTrend.map((day) => Number(day.sales) || 0)
  );
  const revenuePeriods = [
    { title: "Today", key: "today" },
    { title: "Last 7 days", key: "last7Days" },
    { title: "This month", key: "thisMonth" },
  ];

  if (!user?.sellerApproved) {
    return (
      <section className="min-h-screen bg-orange-300/70 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Seller account under review</h1>
          <p className="mt-3 text-slate-600">
            Your store will be available after an admin approves your seller account.
          </p>
        </div>
      </section>
    );
  }

  function formatCurrency(amount) {
    return `৳${Number(amount || 0).toLocaleString("en-BD")}`;
  }

  async function handleOrderStatusUpdate(order, status) {
    setUpdatingOrder(order.key);
    setError("");

    try {
      await updateSellerOrderStatus(order.id, status, order.seller_id);
      setDashboard(await getSellerDashboard());
    } catch (requestError) {
      console.error("Failed to update order status:", requestError);
      setError(requestError.message || "Could not update the order status.");
    } finally {
      setUpdatingOrder("");
    }
  }

  async function handleOrderCancel(order) {
    const confirmed = window.confirm(
      "Cancel your part of this order? Your products in this order will be returned to stock."
    );
    if (!confirmed) return;

    setUpdatingOrder(order.key);
    setError("");

    try {
      await cancelSellerOrder(order.id, order.seller_id);
      setDashboard(await getSellerDashboard());
    } catch (requestError) {
      console.error("Failed to cancel seller order:", requestError);
      setError(requestError.message || "Could not cancel the order.");
    } finally {
      setUpdatingOrder("");
    }
  }

  return (
    <section className="min-h-screen bg-orange-300/70 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
              Seller Center
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Overview of your marketplace activity.
            </p>
          </div>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            <Plus size={18} />
            Add product
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Link
            to="/seller/products"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-500 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="rounded-xl bg-orange-200 p-3 text-orange-600">
                <Package size={21} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  Product management
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Edit products, stock, and availability
                </span>
              </span>
            </span>
            <ArrowUpRight
              size={18}
              className="shrink-0 text-slate-400 transition group-hover:text-orange-700"
            />
          </Link>

          <Link
            to="/seller/products/new"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-500 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                <Plus size={21} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  Add a product
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  List a new item in your store
                </span>
              </span>
            </span>
            <ArrowUpRight
              size={18}
              className="shrink-0 text-slate-400 transition group-hover:text-orange-700"
            />
          </Link>

          <Link
            to="/seller/settings"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-500 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-100 p-3 text-amber-600">
                <Settings size={21} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  Store settings
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Profile, shipping, and payout reference
                </span>
              </span>
            </span>
            <ArrowUpRight
              size={18}
              className="shrink-0 text-slate-400 transition group-hover:text-orange-700"
            />
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-5 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-4 text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {revenuePeriods.map((period) => (
            <div
              key={period.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {period.title} revenue
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {dashboard
                  ? formatCurrency(revenueSummary[period.key])
                  : "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {dashboard?.salesOrderCounts?.[period.key] ?? "—"} orders
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-200 p-3 text-orange-600">
                <BarChart3 size={21} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Sales trend</h2>
                <p className="text-sm text-slate-500">Daily revenue for the last 7 days</p>
              </div>
            </div>
            <div className="mt-6 flex h-44 items-end gap-3">
              {salesTrend.map((day) => {
                const sales = Number(day.sales) || 0;
                const height = Math.max(6, (sales / maxDailySales) * 100);
                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    title={`${day.date}: ${formatCurrency(sales)}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-orange-600"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                        "en-US",
                        { weekday: "short" }
                      )}
                    </span>
                  </div>
                );
              })}
              {!salesTrend.length && (
                <p className="mb-auto text-sm text-slate-500">No sales data available yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                <Trophy size={21} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Best-selling products</h2>
                <p className="text-sm text-slate-500">Ranked by units sold</p>
              </div>
            </div>
            {bestSellingProducts.length ? (
              <ol className="mt-5 divide-y divide-slate-100">
                {bestSellingProducts.map((product, index) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium text-slate-800">
                        {product.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {product.quantity} sold
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 text-sm text-slate-500">
                Best-selling products will appear after your first sale.
              </p>
            )}
          </section>
        </div>

        {/* Recent Orders */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">
              Recent Orders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A quick look at your latest orders.
            </p>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {recentOrders.map((order) => (
              <article
                key={order.key}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-slate-900">
                      {order.id}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {order.customer}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === "Delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.status === "Shipped"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm text-slate-600">
                  {order.product}
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  ৳{order.amount.toLocaleString("en-US")}
                </p>
                {order.can_confirm && (
                  <button
                    type="button"
                    disabled={updatingOrder === order.key}
                    onClick={() =>
                      handleOrderStatusUpdate(order, "Shipped")
                    }
                    className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                  >
                    {updatingOrder === order.key ? "Updating..." : "Confirm order"}
                  </button>
                )}
                {order.status === "Shipped" && (
                  <button
                    type="button"
                    disabled={updatingOrder === order.key}
                    onClick={() =>
                      handleOrderStatusUpdate(order, "Delivered")
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check size={16} />
                    {updatingOrder === order.key ? "Updating..." : "Sold"}
                  </button>
                )}
                {order.can_cancel && (
                  <button
                    type="button"
                    disabled={updatingOrder === order.key}
                    onClick={() => handleOrderCancel(order)}
                    className="mt-3 ml-2 inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    {updatingOrder === order.key ? "Updating..." : "Delete order"}
                  </button>
                )}
              </article>
            ))}
            {!recentOrders.length && (
              <p className="py-6 text-center text-sm text-slate-500">
                No orders yet.
              </p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.key}
                    className="seller-dashboard-order-row hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                      {order.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {order.product}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                      ৳{order.amount.toLocaleString("en-US")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          order.status === "Delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : order.status === "Shipped"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {order.can_confirm && (
                        <button
                          type="button"
                          disabled={updatingOrder === order.key}
                          onClick={() =>
                            handleOrderStatusUpdate(order, "Shipped")
                          }
                          className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                        >
                          {updatingOrder === order.key
                            ? "Updating..."
                            : "Confirm order"}
                        </button>
                      )}
                      {order.can_cancel && (
                        <button
                          type="button"
                          disabled={updatingOrder === order.key}
                          onClick={() => handleOrderCancel(order)}
                          className="ml-2 inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {updatingOrder === order.key ? "Updating..." : "Delete order"}
                        </button>
                      )}
                      {order.status === "Shipped" && (
                        <button
                          type="button"
                          disabled={updatingOrder === order.key}
                          onClick={() =>
                            handleOrderStatusUpdate(order, "Delivered")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check size={14} />
                          {updatingOrder === order.key ? "Updating..." : "Sold"}
                        </button>
                      )}
                      {order.status === "Delivered" && (
                        <span className="text-xs font-medium text-emerald-700">
                          Sold
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SellerDashboardPage;
