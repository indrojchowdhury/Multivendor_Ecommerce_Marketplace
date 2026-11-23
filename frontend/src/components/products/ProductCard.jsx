import { ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
import AddToCartButton from "../cart/AddToCartButton";
import WishlistButton from "../wishlist/WishlistButton";

function ProductCard({ product, compact = false }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
      >
        <span className="sr-only">View product details</span>
      </Link>

      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full object-cover ${
            compact ? "h-28 sm:h-40" : "h-36 sm:h-56"
          }`}
        />

        <WishlistButton product={product} className="z-20" />
      </div>

      <div className="p-3 sm:p-4">
        <p className="text-sm text-slate-500">{product.category}</p>
        {product.company_name && (
          <p className="mt-1 truncate text-xs text-slate-500">
            Sold by {product.company_name}
          </p>
        )}

        <h3 className="mt-2 font-semibold text-slate-900">{product.name}</h3>

        <div className="mt-3 flex items-center gap-1 text-sm text-amber-500">
          <Star size={16} className="fill-current" />
          <span>{product.rating}</span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
          <ShoppingBag size={16} />
          <span>{product.sold_count ?? 0} sold</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-base font-bold text-slate-900 sm:text-lg">
            ৳{product.price.toLocaleString("en-US")}
          </p>

          <AddToCartButton
            product={product}
            variant="icon"
            className="relative z-20"
          />
        </div>
      </div>
    </article>
  );
}

export default ProductCard;