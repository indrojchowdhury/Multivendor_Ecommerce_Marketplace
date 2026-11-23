
import apiRequest from "./client";

export function getProducts(params = {}) {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/products/?${queryString}`
    : "/products/";

  return apiRequest(endpoint);
}

export function getProduct(productId) {
  return apiRequest(`/products/${productId}/`);
}

export function rateProduct(productId, { rating, comment, imageFile }) {
  const formData = new FormData();
  formData.append("rating", rating);
  formData.append("comment", comment);
  if (imageFile) formData.append("image_file", imageFile);

  return apiRequest(`/products/${productId}/reviews/`, {
    method: "POST",
    body: formData,
  });
}

export function getSellerProducts() {
  return apiRequest("/seller/products/");
}

export function createSellerProduct(product) {
  const body = createProductBody(product);
  return apiRequest("/seller/products/", {
    method: "POST",
    body,
  });
}

export function updateSellerProduct(productId, product) {
  const body = createProductBody(product);
  return apiRequest(`/seller/products/${productId}/`, {
    method: "PATCH",
    body,
  });
}

function createProductBody(product) {
  if (!product.image_file) {
    return JSON.stringify(product);
  }

  const formData = new FormData();
  Object.entries(product).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}

export function deleteSellerProduct(productId) {
  return apiRequest(`/seller/products/${productId}/`, {
    method: "DELETE",
  });
}
