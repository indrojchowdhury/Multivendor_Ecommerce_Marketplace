const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("marketplace_access_token") || "";
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("marketplace_refresh_token");
  if (!refresh) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return false;

  const tokens = await response.json();
  if (!tokens.access) return false;

  localStorage.setItem("marketplace_access_token", tokens.access);
  if (tokens.refresh) {
    localStorage.setItem("marketplace_refresh_token", tokens.refresh);
  }
  return true;
}

async function apiRequest(endpoint, options = {}) {
  async function sendRequest(token) {
    const isFormData = options.body instanceof FormData;

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }

  let response = await sendRequest(getAccessToken());
  if (
    response.status === 401 &&
    endpoint !== "/auth/refresh/" &&
    (await refreshAccessToken())
  ) {
    response = await sendRequest(getAccessToken());
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    const message =
      payload.detail ||
      payload.message ||
      payload.error ||
      payload.non_field_errors?.[0] ||
      Object.values(payload).flat().find((value) => typeof value === "string") ||
      `API request failed: ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return contentType.includes("application/json") ? payload : null;
}

export default apiRequest;
