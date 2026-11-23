import apiRequest from "./client";

export function getAdminDashboard() {
  return apiRequest("/auth/admin/dashboard/");
}

export function getAdminUsers() {
  return apiRequest("/auth/admin/users/");
}

export function updateAdminUser(userId, changes) {
  return apiRequest(`/auth/admin/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function getAdminProducts() {
  return apiRequest("/admin/products/");
}

export function updateAdminProduct(productId, changes) {
  return apiRequest(`/admin/products/${productId}/`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function getAdminCategories() {
  return apiRequest("/admin/categories/");
}

export function createAdminCategory(category) {
  return apiRequest("/admin/categories/", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export function updateAdminCategory(categoryId, changes) {
  return apiRequest(`/admin/categories/${categoryId}/`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}
