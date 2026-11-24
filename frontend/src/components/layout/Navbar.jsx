
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  ShoppingCart,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getProducts } from "../../api/products";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useTheme } from "../../context/ThemeContext";

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const canShop = user && ["customer", "admin"].includes(user.role);
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsError, setSuggestionsError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) return undefined;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      getProducts({ search: query, page_size: 5 })
        .then((data) => {
          if (!cancelled) {
            setSuggestions(data.results ?? data);
            setSuggestionsError("");
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error("Failed to load search suggestions:", error);
            setSuggestions([]);
            setSuggestionsError(error.message || "Could not load suggestions.");
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  function handleSearch(event) {
    event.preventDefault();
    const query = searchTerm.trim();

    if (query) {
      setShowSuggestions(false);
      navigate(`/search?search=${encodeURIComponent(query)}`);
    }
  }

  function selectProduct(product) {
    setSearchTerm("");
    setShowSuggestions(false);
    navigate(`/products/${product.id}`);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#131921] bg-[#131921] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <Link
          to="/"
          onClick={() => {
            setSearchTerm("");
            setShowSuggestions(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="shrink-0"
        >
          <span className="text-2xl font-black tracking-tight sm:text-3xl" aria-label="FlipBox">
            <span className="text-white">Flip</span>
            <span className="text-orange-400">Box</span>
          </span>
        </Link>

        <div className="relative order-last w-full min-w-0 md:order-none md:mx-auto md:max-w-xl md:flex-1">
          <form
            onSubmit={handleSearch}
            className="flex items-center rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-within:border-orange-500"
          >
            <Search size={19} className="shrink-0 text-orange-600" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                if (!event.target.value.trim()) setSuggestions([]);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder="Search products..."
              aria-label="Search products"
              autoComplete="off"
              className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </form>

          {showSuggestions && searchTerm.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {suggestionsError ? (
                <p role="alert" className="px-4 py-4 text-sm text-red-600">
                  {suggestionsError}
                </p>
              ) : suggestions.length > 0 ? (
                suggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectProduct(product)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <img
                      src={product.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        ৳{product.price.toLocaleString("en-US")}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-4 py-4 text-sm text-slate-500">
                  No matching products
                </p>
              )}
            </div>
          )}
        </div>

        {!user && location.pathname === "/" && (
          <Link
            to="/register"
            className="flex shrink-0 items-center whitespace-nowrap rounded-xl p-2 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Become a seller
          </Link>
        )}

        <Link
          to={user ? "/profile" : "/login"}
          aria-label={user ? "My profile" : "Sign in"}
          className="flex shrink-0 items-center gap-2 rounded-xl p-2 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <UserRound size={22} />
          <span className="hidden max-w-24 truncate sm:inline">
            {user ? user.name.split(" ")[0] : "Sign in"}
          </span>
        </Link>

        {user && ["seller", "admin"].includes(user.role) && (
          <Link
            to={user.role === "admin" ? "/admin/dashboard" : "/seller/dashboard"}
            aria-label={user.role === "admin" ? "Admin dashboard" : "Seller dashboard"}
            title={user.role === "admin" ? "Admin dashboard" : "Seller dashboard"}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
          >
            <LayoutDashboard size={20} />
            <span>{user.role === "admin" ? "Admin" : "Dashboard"}</span>
          </Link>
        )}

        {user && (
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className="flex shrink-0 items-center gap-2 rounded-xl p-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex shrink-0 items-center justify-center rounded-xl p-2 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          {theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
        </button>

        {canShop && (
          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} items`}
            className="relative shrink-0 rounded-xl p-2 text-slate-200 hover:bg-white/10 hover:text-red-300"
          >
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>
        )}

        {canShop && (
          <Link
            to="/cart"
            aria-label={`Shopping cart, ${totalItems} items`}
            className="relative shrink-0 rounded-xl p-2 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-semibold text-white">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
