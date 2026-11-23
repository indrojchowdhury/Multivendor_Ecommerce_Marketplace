import { useCallback, useEffect, useState } from "react";
import {
  createAdminCategory,
  getAdminCategories,
  getAdminDashboard,
  getAdminProducts,
  getAdminUsers,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminUser,
} from "../api/admin";

const EMPTY_COUNTS = {
  users: 0,
  activeUsers: 0,
  pendingSellers: 0,
  products: 0,
  pendingProducts: 0,
  categories: 0,
  activeCategories: 0,
  orders: 0,
};

const cardStyle =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const buttonStyle =
  "rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminDashboardPage() {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    const [dashboard, userList, productList, categoryList] =
      await Promise.all([
        getAdminDashboard(),
        getAdminUsers(),
        getAdminProducts(),
        getAdminCategories(),
      ]);
    return { dashboard, userList, productList, categoryList };
  }, []);

  const applyDashboard = useCallback(
    ({ dashboard, userList, productList, categoryList }) => {
      setCounts(dashboard);
      setUsers(userList);
      setProducts(productList);
      setCategories(categoryList);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(loadDashboard)
      .then((data) => {
        if (!cancelled) applyDashboard(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || "Could not load admin dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyDashboard, loadDashboard]);

  async function saveAction(key, action, successMessage) {
    setWorking(key);
    setError("");
    setNotice("");
    try {
      await action();
      applyDashboard(await loadDashboard());
      setNotice(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message || "Could not save this change.");
      return false;
    } finally {
      setWorking("");
    }
  }

  async function handleCategoryCreate(event) {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }

    const saved = await saveAction(
      "category-create",
      () =>
        createAdminCategory({
          ...categoryForm,
          name,
          slug: makeSlug(name),
        }),
      "Category created."
    );
    if (saved) {
      setCategoryForm({ name: "", slug: "", description: "", image_url: "" });
    }
  }

  const statCards = [
    ["Users", counts.users],
    ["Active users", counts.activeUsers],
    ["Pending sellers", counts.pendingSellers],
    ["Products", counts.products],
    ["Products awaiting review", counts.pendingProducts],
    ["Categories", counts.categories],
    ["Active categories", counts.activeCategories],
    ["Orders", counts.orders],
  ];

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
            FlipBox Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Admin dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Review seller applications, moderate products, and manage users and categories.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {notice}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-slate-500">Loading dashboard...</p>
        ) : (
          <>
            <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(([label, value]) => (
                <article key={label} className={cardStyle}>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </article>
              ))}
            </div>

            <section className={`${cardStyle} mb-8`}>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Seller accounts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Approval unlocks seller tools and makes the seller&apos;s approved products visible.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Seller</th>
                      <th className="px-3 py-3 font-semibold">Store</th>
                      <th className="px-3 py-3 font-semibold">Approval</th>
                      <th className="px-3 py-3 font-semibold">Account</th>
                      <th className="px-3 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((user) => user.role === "seller")
                      .map((user) => (
                        <tr key={user.id}>
                          <td className="px-3 py-4">
                            <span className="block font-semibold text-slate-900">
                              {user.full_name}
                            </span>
                            <span className="text-slate-500">{user.email}</span>
                          </td>
                          <td className="px-3 py-4 text-slate-700">
                            {user.company_name || "—"}
                          </td>
                          <td className="px-3 py-4">
                            {user.seller_approved ? "Approved" : "Pending"}
                          </td>
                          <td className="px-3 py-4">
                            {user.is_active ? "Active" : "Disabled"}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex gap-2">
                              {!user.seller_approved && (
                                <button
                                  type="button"
                                  disabled={working === `seller-${user.id}`}
                                  onClick={() =>
                                    saveAction(
                                      `seller-${user.id}`,
                                      () => updateAdminUser(user.id, { seller_approved: true }),
                                      `${user.company_name || user.full_name} approved.`
                                    )
                                  }
                                  className={`${buttonStyle} bg-orange-600 text-white hover:bg-orange-700`}
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={working === `user-${user.id}`}
                                onClick={() =>
                                  saveAction(
                                    `user-${user.id}`,
                                    () => updateAdminUser(user.id, { is_active: !user.is_active }),
                                    `Seller account ${user.is_active ? "disabled" : "enabled"}.`
                                  )
                                }
                                className={`${buttonStyle} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                              >
                                {user.is_active ? "Disable" : "Enable"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {users.filter((user) => user.role === "seller").length === 0 && (
                      <tr><td colSpan="5" className="px-3 py-8 text-center text-slate-500">No seller accounts yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${cardStyle} mb-8`}>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Product moderation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Newly submitted seller products stay hidden until approved.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Product</th>
                      <th className="px-3 py-3 font-semibold">Seller</th>
                      <th className="px-3 py-3 font-semibold">Category</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-4 font-semibold text-slate-900">{product.name}</td>
                        <td className="px-3 py-4 text-slate-700">{product.seller_name}</td>
                        <td className="px-3 py-4 text-slate-700">{product.category}</td>
                        <td className="px-3 py-4">{product.is_approved ? "Approved" : "Pending / hidden"}</td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            disabled={working === `product-${product.id}`}
                            onClick={() =>
                              saveAction(
                                `product-${product.id}`,
                                () => updateAdminProduct(product.id, { is_approved: !product.is_approved }),
                                `Product ${product.is_approved ? "hidden" : "approved"}.`
                              )
                            }
                            className={`${buttonStyle} ${
                              product.is_approved
                                ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                : "bg-orange-600 text-white hover:bg-orange-700"
                            }`}
                          >
                            {product.is_approved ? "Deactivate" : "Approve"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan="5" className="px-3 py-8 text-center text-slate-500">No products available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <div className={cardStyle}>
                <h2 className="mb-5 text-xl font-bold text-slate-900">Categories</h2>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{category.name}</p>
                        <p className="text-sm text-slate-500">{category.slug}</p>
                      </div>
                      <button
                        type="button"
                        disabled={working === `category-${category.id}`}
                        onClick={() =>
                          saveAction(
                            `category-${category.id}`,
                            () => updateAdminCategory(category.id, { is_active: !category.is_active }),
                            `Category ${category.is_active ? "deactivated" : "activated"}.`
                          )
                        }
                        className={`${buttonStyle} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                      >
                        {category.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">No categories yet.</p>
                  )}
                </div>
              </div>

              <form className={`${cardStyle} h-fit space-y-4`} onSubmit={handleCategoryCreate}>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Add category</h2>
                  <p className="mt-1 text-sm text-slate-500">The URL slug is generated from its name.</p>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    value={categoryForm.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setCategoryForm((current) => ({
                        ...current,
                        name,
                        slug:
                          !current.slug || current.slug === makeSlug(current.name)
                            ? makeSlug(name)
                            : current.slug,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </label>
                  <label className="block text-sm font-medium text-slate-700">
                    URL slug
                    <input
                      value={categoryForm.slug}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          slug: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      required
                    />
                  </label>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows="3"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Image URL (optional)
                  <input
                    type="url"
                    value={categoryForm.image_url}
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, image_url: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={working === "category-create"}
                  className={`${buttonStyle} w-full bg-orange-600 py-3 text-white hover:bg-orange-700`}
                >
                  Add category
                </button>
              </form>
            </section>

            <section className={`${cardStyle} mt-8`}>
              <h2 className="mb-4 text-xl font-bold text-slate-900">Customer accounts</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Customer</th>
                      <th className="px-3 py-3 font-semibold">Joined</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.filter((user) => user.role === "customer").map((user) => (
                      <tr key={user.id}>
                        <td className="px-3 py-4">
                          <span className="block font-semibold text-slate-900">{user.full_name}</span>
                          <span className="text-slate-500">{user.email}</span>
                        </td>
                        <td className="px-3 py-4 text-slate-600">
                          {new Date(user.date_joined).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4">{user.is_active ? "Active" : "Disabled"}</td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            disabled={working === `user-${user.id}`}
                            onClick={() =>
                              saveAction(
                                `user-${user.id}`,
                                () => updateAdminUser(user.id, { is_active: !user.is_active }),
                                `Customer account ${user.is_active ? "disabled" : "enabled"}.`
                              )
                            }
                            className={`${buttonStyle} border border-slate-300 text-slate-700 hover:bg-slate-50`}
                          >
                            {user.is_active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter((user) => user.role === "customer").length === 0 && (
                      <tr><td colSpan="4" className="px-3 py-8 text-center text-slate-500">No customer accounts yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}

export default AdminDashboardPage;
