import apiRequest from "./client";

export function getOrders() {
  return apiRequest("/orders/");
}

export function getOrder(orderId) {
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/`);
}

export function createOrder(order) {
  return apiRequest("/orders/", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export function clearOrderHistory() {
  return apiRequest("/orders/history/", {
    method: "DELETE",
  });
}
