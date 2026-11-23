
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { getCategories } from "../api/categories";
import {
  createSellerProduct,
  getSellerProducts,
  updateSellerProduct,
} from "../api/products";

const initialForm = {
  name: "",
  category: "",
  price: "",
  stock: "",
  description: "",
  image: "",
  is_active: true,
};

function SellerProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imageFilePreview, setImageFilePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imagePreviewUrl = useRef("");

  const existingProduct = useMemo(
    () =>
      isEditing
        ? allProducts.find((product) => String(product.id) === String(id))
        : null,
    [allProducts, id, isEditing]
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([getSellerProducts(), getCategories()])
      .then(([products, availableCategories]) => {
        if (!cancelled) {
          setAllProducts(products);
          setCategories(availableCategories.map((category) => category.name));
          const productToEdit = products.find(
            (product) => String(product.id) === String(id)
          );
          if (isEditing && productToEdit) {
            setForm({
              name: productToEdit.name || "",
              category: productToEdit.category || "",
              price: String(productToEdit.price ?? ""),
              stock: String(productToEdit.stock ?? ""),
              description: productToEdit.description || "",
              image: productToEdit.image || "",
              is_active: productToEdit.is_active,
            });
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSubmitError(error.message || "Could not load product data.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  useEffect(
    () => () => {
      if (imagePreviewUrl.current) {
        URL.revokeObjectURL(imagePreviewUrl.current);
      }
    },
    []
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function handleImageFileChange(event) {
    const file = event.target.files?.[0] || null;

    if (file && !["image/jpeg", "image/png"].includes(file.type)) {
      setSelectedImageFile(null);
      setErrors((current) => ({
        ...current,
        image_file: "Choose a JPG or PNG image.",
      }));
      event.target.value = "";
      return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
      setSelectedImageFile(null);
      setErrors((current) => ({
        ...current,
        image_file: "Image files must be 5 MB or smaller.",
      }));
      event.target.value = "";
      return;
    }

    setSelectedImageFile(file);
    setErrors((current) => ({ ...current, image_file: "" }));
    setSubmitError("");
  }

  function setSelectedImageFile(file) {
    if (imagePreviewUrl.current) {
      URL.revokeObjectURL(imagePreviewUrl.current);
    }

    imagePreviewUrl.current = file ? URL.createObjectURL(file) : "";
    setImageFilePreview(imagePreviewUrl.current);
    setImageFile(file);
  }

  function validateForm() {
    const nextErrors = {};
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      nextErrors.name = "Product name is required.";
    }

    if (!form.category.trim()) {
      nextErrors.category = "Select a category.";
    }

    if (
      form.price.trim() === "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      nextErrors.price = "Enter a valid price greater than zero.";
    }

    if (
      form.stock.trim() === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      nextErrors.stock = "Enter a whole stock quantity of zero or more.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Product description is required.";
    }

    if (form.image.trim()) {
      try {
        const url = new URL(form.image.trim());

        if (!["http:", "https:"].includes(url.protocol)) {
          nextErrors.image = "Use a valid HTTP or HTTPS image URL.";
        }
      } catch {
        nextErrors.image = "Enter a valid image URL.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    if (!validateForm()) return;

    setIsSaving(true);

    const productData = {
      ...(existingProduct || {}),
      id: isEditing ? existingProduct.id : Date.now(),
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      description: form.description.trim(),
      image: form.image.trim(),
      ...(imageFile ? { image_file: imageFile } : {}),
      is_active: form.is_active,
    };

    try {
      if (isEditing) {
        await updateSellerProduct(id, productData);
      } else {
        await createSellerProduct(productData);
      }

      navigate("/seller/products", {
        state: {
          message: isEditing
            ? "Product updated successfully."
            : "Product added successfully.",
        },
      });
    } catch (error) {
      setSubmitError(error.message || "Could not save the product.");
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <section className="mx-auto max-w-3xl px-4 py-16 text-center">Loading product...</section>;
  }

  if (isEditing && !existingProduct) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Product not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This product may have been deleted or does not exist.
        </p>
        <Link
          to="/seller/products"
          className="mt-5 inline-flex text-orange-600 hover:text-orange-700"
        >
          Back to Products
        </Link>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/seller/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-700"
        >
          <ArrowLeft size={17} />
          Back to Products
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
              Seller Center
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter the product information below.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Product Name *
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-orange-600"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  {form.category && !categories.includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Price (৳) *
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
                  placeholder="e.g. 1850"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="stock"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Stock Quantity *
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
                placeholder="Available quantity"
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
                placeholder="Describe the product"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Product is available for sale
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Turn this off to hide the product from customers without deleting it.
                </span>
              </span>
            </label>

            <div>
              <label
                htmlFor="image"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Image URL (optional)
              </label>
              <input
                id="image"
                name="image"
                type="url"
                value={form.image}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600"
                placeholder="https://example.com/product.jpg"
              />
              {errors.image && (
                <p className="mt-1 text-sm text-red-600">{errors.image}</p>
              )}

              <label
                htmlFor="image_file"
                className="mb-2 mt-4 block text-sm font-medium text-slate-700"
              >
                Or upload an image
              </label>
              <input
                id="image_file"
                name="image_file"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                onChange={handleImageFileChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold file:text-slate-700"
              />
              {errors.image_file && (
                <p className="mt-1 text-sm text-red-600">{errors.image_file}</p>
              )}

              {(imageFilePreview || (form.image && !errors.image)) && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-slate-500">Image preview</p>
                  <img
                    src={imageFilePreview || form.image}
                    alt="Product preview"
                    className="h-36 w-36 rounded-xl border border-slate-200 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.display = "block";
                    }}
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Upload a JPG or PNG file up to 5 MB, or use a publicly accessible image URL.
              </p>
            </div>

            {submitError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {submitError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                to="/seller/products"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default SellerProductFormPage;
