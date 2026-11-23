const ORDERS_KEY = "marketplace_orders";

function readAll() {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/*
 * Order shape:
 * {
 *   id: "ORD-LX3K9A2B",
 *   date: "2026-10-26T10:30:00.000Z",
 *   status: "Processing" | "Shipped" | "Delivered" | "Cancelled",
 *   items: [{ id, name, price, image, quantity }],
 *   subtotal: 4980,
 *   shippingFee: 60,
 *   total: 5040,
 *   shippingAddress: { fullName, phone, district, area, address, note },
 *   paymentMethod: "cod" | "sslcommerz",
 *   paymentStatus: "Pay on delivery" | "Pending" | "Paid" | "Failed"
 * }
 *
 * The Django API calculates order prices and totals.
 */
export function generateOrderId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

export function getOrders(email) {
  const orders = readAll()[email];
  return Array.isArray(orders) ? orders : [];
}

export function getOrder(email, orderId) {
  return getOrders(email).find((order) => order.id === orderId) || null;
}

export function saveOrder(email, order) {
  const all = readAll();
  all[email] = [order, ...getOrders(email)];

  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}