import { Check, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

function AddToCartButton({
  product,
  quantity = 1,
  variant = "full",
  className = "",
}) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    const result = addToCart(product, quantity);
    if (!result.added) {
      window.alert(result.message);
      return;
    }

    setAdded(true);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  }

  const colors = added ? "bg-emerald-600" : "bg-orange-600 hover:bg-orange-700";
  const Icon = added ? Check : ShoppingCart;

  if (user && !["customer", "admin"].includes(user.role)) return null;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          added
            ? `${product.name} added to cart`
            : user
              ? `Add ${product.name} to cart`
              : `Sign in to add ${product.name} to your cart`
        }
        className={`rounded-xl p-3 text-white transition ${colors} ${className}`}
      >
        <Icon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${colors} ${className}`}
    >
      <Icon size={18} />
      {added ? "Added" : user ? "Add to Cart" : "Sign in to add"}
    </button>
  );
}

export default AddToCartButton;