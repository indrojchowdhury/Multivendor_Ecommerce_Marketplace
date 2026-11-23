
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/products/ProductCard";
import { getProducts } from "../api/products";

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProducts({ search: searchTerm.trim() })
      .then((data) => {
        if (!cancelled) setProducts(data.results ?? data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to search products:", requestError);
          setError(requestError.message || "Could not load products.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  return (
    <section className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {error ? (
          <div role="alert" className="py-12 text-center text-red-600">
            {error}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No products found
            </h2>
            <p className="mt-2 text-slate-600">
              Try searching with a different product name.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SearchResultsPage;
