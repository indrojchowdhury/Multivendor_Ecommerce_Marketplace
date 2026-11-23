import apiRequest from "./client";

export function getSellerDashboard() {
  return apiRequest("/orders/seller/dashboard/");
}

export function updateSellerOrderStatus(orderId, status, sellerId) {
  return apiRequest(
    `/orders/${encodeURIComponent(orderId)}/seller-status/`,
    {
      method: "POST",
      body: JSON.stringify({ status, seller_id: sellerId }),
    }
  );
}

export function cancelSellerOrder(orderId, sellerId) {
  return apiRequest(
    `/orders/${encodeURIComponent(orderId)}/seller-status/`,
    {
      method: "DELETE",
      body: JSON.stringify({ seller_id: sellerId }),
    }
  );
}
