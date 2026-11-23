import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const MAX_QUANTITY = 99;

function formatPrice(value) {
  return `৳${value.toLocaleString("en-US")}`;
}

function CartPage() {
  const { cartItems, totalItems, subtotal, updateQuantity, removeFromCart, clearCart } =
    useCart();

  if (cartItems.length === 0) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ShoppingBag size={40} className="mx-auto text-slate-400" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Your cart is empty
          </h1>

          <p className="mt-2 text-slate-600">
            Add a product to see it here.
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
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Shopping Cart</h1>
            <p className="mt-2 text-slate-600">
              {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-sm font-semibold text-slate-500 transition hover:text-red-600"
          >
            Clear cart
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {cartItems.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <Link to={`/products/${item.id}`} className="shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">{item.category}</p>

                      <Link
                        to={`/products/${item.id}`}
                        className="mt-1 block truncate font-semibold text-slate-900 hover:text-orange-700"
                      >
                        {item.name}
                      </Link>

                      <p className="mt-1 text-sm text-slate-600">
                        {formatPrice(item.price)} each
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="p-2.5 text-slate-700 transition hover:bg-slate-100"
                      >
                        <Minus size={16} />
                      </button>

                      <span
                        className="min-w-10 text-center text-sm font-semibold text-slate-900"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            Math.min(item.quantity + 1, MAX_QUANTITY)
                          )
                        }
                        disabled={item.quantity >= MAX_QUANTITY}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="p-2.5 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="text-lg font-bold text-slate-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">
                  Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatPrice(subtotal)}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-slate-600">Shipping</dt>
                <dd className="text-slate-500">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-between border-t border-slate-200 pt-5">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-slate-900">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Link
              to="/checkout"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
            >
              Proceed to Checkout
            </Link>

            <Link
              to="/"
              className="mt-3 block text-center text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default CartPage;