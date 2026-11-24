
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/products/ProductCard";
import { getProducts } from "../api/products";
import { getCategories } from "../api/categories";
import CategoryCard from "../components/categories/CategoryCard";
import localCategories from "../data/categories";

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productsScroller = useRef(null);

  const searchTerm = searchParams.get("search") || "";
  const selectedCategory = searchParams.get("category") || "All";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(
            data.map((category) => ({
              ...category,
              icon:
                localCategories.find(
                  (localCategory) =>
                    localCategory.name.toLowerCase() === category.name.toLowerCase()
                )?.icon || localCategories[0]?.icon,
            }))
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load categories:", err);
          setCategoryError("Categories could not be loaded. Check the API connection.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const params = {};

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        if (selectedCategory !== "All") {
          params.category = selectedCategory;
        }

        const data = await getProducts({
          ...params,
          page_size: 48,
          ordering: "-rating",
        });

        if (!cancelled) {
          setProducts(data.results ?? data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load products:", err);
          setError("Products could not be loaded. Check the Django server and API.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, selectedCategory]);

  function setCategory(categoryName) {
    const params = new URLSearchParams(searchParams);

    if (categoryName === "All") {
      params.delete("category");
    } else {
      params.set("category", categoryName);
    }

    setSearchParams(params);
  }

  function handleCategoryClick(categoryName) {
    setCategory(categoryName);

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <div>
      <section
        id="products"
        className="bg-orange-300/70 px-3 py-5 sm:px-6 sm:py-7 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-3 sm:mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {searchTerm
                  ? "Search results"
                  : selectedCategory === "All"
                    ? "Popular products"
                    : `Popular ${selectedCategory} products`}
              </h1>
              {searchTerm && (
                <p className="mt-2 text-sm text-slate-600">
                  Showing the best matches for "{searchTerm}".
                </p>
              )}
            </div>

            {selectedCategory !== "All" && (
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="mt-4 text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Show All Products
              </button>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-600">
              Loading products...
            </p>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center">
              <p className="text-red-600">{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Retry
              </button>
            </div>
          ) : products.length > 0 ? (
            products.length > 5 ? (
              <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <button
                  type="button"
                  onClick={() =>
                    productsScroller.current?.scrollBy({
                      left: -productsScroller.current.clientWidth,
                      behavior: "smooth",
                    })
                  }
                  className="shrink-0 rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-md transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  aria-label="Show previous popular products"
                >
                  <ChevronLeft size={22} />
                </button>
                <div
                  ref={productsScroller}
                  className="min-w-0 flex-1 overflow-x-auto scroll-smooth"
                  aria-label="Popular products"
                >
                  <div className="flex w-full gap-3 sm:gap-5">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="w-[calc((100%_-_0.75rem)/2)] shrink-0 sm:w-[calc((100%_-_2.5rem)/3)] lg:w-[calc((100%_-_5rem)/5)]"
                      >
                        <ProductCard product={product} compact />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    productsScroller.current?.scrollBy({
                      left: productsScroller.current.clientWidth,
                      behavior: "smooth",
                    })
                  }
                  className="shrink-0 rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-md transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  aria-label="Show more popular products"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No products found
              </h3>

              <p className="mt-2 text-slate-600">
                Try another category or search term.
              </p>

              <button
                type="button"
                onClick={() => setCategory("All")}
                className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Show All Products
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section
        id="categories"
        className="bg-orange-200/70 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
              Browse collections
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Shop by category
            </h2>
            <p className="mt-3 text-slate-600">
              Explore products from different categories.
            </p>
          </div>
          {categoryError ? (
            <p role="alert" className="text-sm text-red-600">{categoryError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCategoryClick(category.name);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-orange-600"
                  aria-label={`Show ${category.name} products`}
                >
                  <CategoryCard category={category} index={index} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[1fr_auto]">
          <div className="bg-emerald-50 px-5 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
              For sellers
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Grow your business with FlipBox
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Reach more customers and manage your store in one place.
            </p>
          </div>
          <div className="flex items-center border-t border-slate-200 bg-slate-50 px-5 py-4 sm:border-l sm:border-t-0 sm:px-7">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 sm:w-auto"
            >
              Open a seller account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
