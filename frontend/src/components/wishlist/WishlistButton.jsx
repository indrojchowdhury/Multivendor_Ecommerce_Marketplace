import { Heart } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";

function WishlistButton({ product, variant = "overlay", className = "" }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const saved = isInWishlist(product.id);

  if (user?.role === "seller") return null;

  function handleClick(event) {
    // Prevent the click from triggering a parent <Link>
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product.id);
  }

  const label = saved
    ? `Remove ${product.name} from wishlist`
    : `Add ${product.name} to wishlist`;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-base font-semibold transition ${
          saved
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        } ${className}`}
      >
        <Heart size={18} className={saved ? "fill-current" : ""} />
        {saved ? "Saved" : "Add to Wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      className={`absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow transition hover:scale-105 ${
        saved ? "text-rose-600" : "text-slate-500 hover:text-rose-600"
      } ${className}`}
    >
      <Heart size={18} className={saved ? "fill-current" : ""} />
    </button>
  );
}

export default WishlistButton;