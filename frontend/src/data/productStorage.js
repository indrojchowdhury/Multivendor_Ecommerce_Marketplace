
import initialProducts from "./products";

const STORAGE_KEY = "marketplace_products";

export function getStoredProducts() {
  try {
    const storedProducts = localStorage.getItem(STORAGE_KEY);

    if (storedProducts !== null) {
      return JSON.parse(storedProducts);
    }
  } catch (error) {
    console.error("Could not load saved products:", error);
  }

  return initialProducts;
}

export function saveStoredProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    console.error("Could not save products:", error);
    return false;
  }
}
