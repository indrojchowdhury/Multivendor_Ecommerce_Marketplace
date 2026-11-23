import { ArrowLeft, Minus, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddToCartButton from "../components/cart/AddToCartButton";
import WishlistButton from "../components/wishlist/WishlistButton";
import { getProduct } from "../api/products";
import { useAuth } from "../context/AuthContext";

const MAX_QUANTITY = 99;

function ProductDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loadedProductId, setLoadedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const response = await getProduct(id);

        if (!cancelled) {
          setProduct(response);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load product:", error);
          setLoadError(error.message || "Could not load this product.");
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoadedProductId(id);
      }
    }

    if (id) {
      loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadedProductId !== id) {
    return <section className="px-4 py-20 text-center">Loading product...</section>;
  }

  if (!product) {
    return (
      <section className="px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Product not found
        </h1>
        <p className="mt-3 text-slate-600">
          {loadError || "The product you are looking for does not exist."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-700"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="grid gap-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2">
          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={product.image}
              alt={product.name}
              className="h-56 w-full object-contain sm:h-72"
            />
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
              {product.category}
            </p>
            {product.company_name && (
              <p className="mt-2 text-sm text-slate-500">
                Sold by <span className="font-semibold text-slate-700">{product.company_name}</span>
              </p>
            )}

            <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-center gap-2 text-amber-500">
              <Star size={18} className="fill-current" />
              <span className="font-semibold">{product.rating}</span>
              <span className="text-sm text-slate-500">
                Customer rating ({product.review_count || 0})
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              ৳{product.price.toLocaleString("en-US")}
            </p>

            <p
              className={`mt-2 text-sm font-medium ${
                product.stock > 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {product.stock > 0
                ? `In stock: ${product.stock}`
                : "Out of stock"}
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {product.description || "No product description available."}
            </p>

            {user?.role !== "seller" && (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="p-3 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus size={18} />
                  </button>

                  <span
                    className="min-w-12 text-center font-semibold text-slate-900"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))
                    }
                    disabled={quantity >= MAX_QUANTITY}
                    aria-label="Increase quantity"
                    className="p-3 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <AddToCartButton
                  product={product}
                  quantity={quantity}
                  className="px-8 py-3 text-base"
                />

                <WishlistButton product={product} variant="full" />
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Customer reviews</h2>
            <p className="text-sm text-slate-500">
              {product.review_count || 0}{" "}
              {(product.review_count || 0) === 1 ? "review" : "reviews"}
            </p>
          </div>
          {product.reviews?.length ? (
            <ul className="divide-y divide-slate-200">
              {product.reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold text-slate-900">
                        {review.customer_name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                        <Star size={15} className="fill-current" />
                        {review.rating}
                      </span>
                      <time
                        dateTime={review.created_at}
                        className="text-xs text-slate-500"
                      >
                        {new Date(review.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                  </div>
                  {review.image && (
                    <img
                      src={review.image}
                      alt={`Product shared by ${review.customer_name}`}
                      className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No customer reviews yet.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

export default ProductDetailsPage;