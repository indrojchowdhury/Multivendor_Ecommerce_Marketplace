import { createContext, useContext, useEffect, useState } from "react";

const WISHLIST_STORAGE_KEY = "marketplace_wishlist";

const WishlistContext = createContext(null);

function loadWishlist() {
  try {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [wishlistIds, setWishlistIds] = useState(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage errors
    }
  }, [wishlistIds]);

  function isInWishlist(productId) {
    return wishlistIds.includes(productId);
  }

  function toggleWishlist(productId) {
    setWishlistIds((ids) =>
      ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [...ids, productId]
    );
  }

  function clearWishlist() {
    setWishlistIds([]);
  }

  const value = {
    wishlistIds,
    wishlistCount: wishlistIds.length,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside a WishlistProvider");
  }

  return context;
}