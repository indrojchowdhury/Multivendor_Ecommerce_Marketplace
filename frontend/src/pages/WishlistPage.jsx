import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import ProductCard from "../components/products/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { getProducts } from "../api/products";

function WishlistPage() {
  const { wishlistIds, wishlistCount, clearWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProducts({ page_size: 48 })
      .then((data) => {
        if (!cancelled) setProducts(data.results ?? data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to load wishlist products:", requestError);
          setError(requestError.message || "Could not load wishlist products.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const wishlistProducts = products.filter((product) =>
    wishlistIds.includes(product.id) || wishlistIds.includes(String(product.id))
  );

  if (error) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <p role="alert" className="text-center text-red-600">{error}</p>
      </section>
    );
  }

  if (wishlistProducts.length === 0) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Heart size={40} className="mx-auto text-slate-400" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Your wishlist is empty
          </h1>

          <p className="mt-2 text-slate-600">
            Tap the heart on any product to save it here.
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            Browse products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Wishlist</h1>
            <p className="mt-2 text-slate-600">
              {wishlistCount} saved {wishlistCount === 1 ? "product" : "products"}
            </p>
          </div>

          <button
            type="button"
            onClick={clearWishlist}
            className="text-sm font-semibold text-slate-500 transition hover:text-red-600"
          >
            Clear wishlist
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default WishlistPage;