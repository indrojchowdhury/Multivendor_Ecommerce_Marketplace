
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { deleteSellerProduct, getSellerProducts } from "../api/products";

export default function SellerProductsPage() {
  const [search, setSearch] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getSellerProducts()
      .then((products) => {
        if (!cancelled) setSellerProducts(products);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message || "Could not load products.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return sellerProducts.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";

      return (
        name.includes(searchText) ||
        category.includes(searchText)
      );
    });
  }, [search, sellerProducts]);

  const handleDeleteProduct = async () => {
    if (deleteTarget === null) return;

    try {
      await deleteSellerProduct(deleteTarget);
      setSellerProducts((products) =>
        products.filter((product) => String(product.id) !== String(deleteTarget))
      );
      setDeleteTarget(null);
      setMessage("Product deleted successfully.");
    } catch (error) {
      setMessage(error.message || "Could not delete the product. Please try again.");
    }
  };

  const productToDelete = sellerProducts.find(
    (product) => String(product.id) === String(deleteTarget)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            My Products
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage your store products from here.
          </p>
        </div>

        <Link
          to="/seller/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus size={18} />
          Add Product
        </Link>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        >
          <div className="flex items-center justify-between gap-3">
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="font-semibold hover:text-slate-950"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-8 max-w-md">
        <label
          htmlFor="product-search"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Search products
        </label>

        <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            id="product-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product or category..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="mt-6 space-y-3 md:hidden">
        {filteredProducts.map((product) => (
          <article
            key={product.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words font-semibold text-slate-900">
                  {product.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {product.category || "Uncategorized"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  !product.is_approved
                    ? "bg-amber-100 text-amber-700"
                    : product.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {!product.is_approved
                  ? "Pending review"
                  : product.is_active
                    ? "Available"
                    : "Unavailable"}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
              <div>
                <dt className="text-slate-500">Price</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  ৳{Number(product.price).toLocaleString("en-BD")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Stock</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {product.stock ?? "Not configured"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
              <Link
                to={`/seller/products/${product.id}/edit`}
                className="seller-product-action seller-product-action--edit inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
              >
                <Pencil size={16} />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setDeleteTarget(product.id);
                }}
                className="seller-product-action seller-product-action--delete inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </article>
        ))}
        {filteredProducts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
            {sellerProducts.length === 0
              ? "No products available. Add your first product."
              : "No products match your search."}
          </div>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[750px] text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Product
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Category
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Price
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Stock
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Status
              </th>
              <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className="seller-products-table-row hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">
                    {product.name}
                  </div>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {product.category || "Uncategorized"}
                </td>

                <td className="px-5 py-4 text-sm font-medium text-slate-900">
                  ৳{Number(product.price).toLocaleString("en-BD")}
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {product.stock ?? "Not configured"}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      !product.is_approved
                        ? "bg-amber-100 text-amber-700"
                        : product.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {!product.is_approved
                      ? "Pending review"
                      : product.is_active
                        ? "Available"
                        : "Unavailable"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/seller/products/${product.id}/edit`}
                      aria-label={`Edit ${product.name}`}
                      title="Edit product"
                      className="seller-product-action seller-product-action--edit rounded-lg border p-2"
                    >
                      <Pencil size={18} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setDeleteTarget(product.id);
                      }}
                      aria-label={`Delete ${product.name}`}
                      title="Delete product"
                      className="seller-product-action seller-product-action--delete rounded-lg border p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  {sellerProducts.length === 0
                    ? "No products available. Add your first product."
                    : "No products match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation — outside the table */}
      {deleteTarget !== null && (
        <div
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <h2
            id="delete-dialog-title"
            className="text-lg font-semibold text-red-900"
          >
            Delete this product?
          </h2>

          <p
            id="delete-dialog-description"
            className="mt-2 text-sm text-red-800"
          >
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {productToDelete?.name || "this product"}
            </span>
            ? This action cannot be undone from this page.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDeleteProduct}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
