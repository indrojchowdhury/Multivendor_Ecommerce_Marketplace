import apiRequest from "./client";

export function registerUser({
  full_name,
  email,
  password,
  role = "customer",
  company_name,
}) {
  const normalizedEmail = email.trim().toLowerCase();

  return apiRequest("/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password,
      role,
      ...(company_name ? { company_name } : {}),
    }),
  });
}

export function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  return apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      password,
    }),
  });
}

export function logoutUser(refreshToken) {
  return apiRequest("/auth/logout/", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

export function updateCurrentUser(changes) {
  const payload = {};
  if (changes.name !== undefined) payload.full_name = changes.name;
  if (changes.companyName !== undefined) {
    payload.company_name = changes.companyName;
  }
  if (changes.companyDescription !== undefined) {
    payload.company_description = changes.companyDescription;
  }
  if (changes.contactPhone !== undefined) {
    payload.contact_phone = changes.contactPhone;
  }
  if (changes.businessAddress !== undefined) {
    payload.business_address = changes.businessAddress;
  }
  if (changes.shippingPolicy !== undefined) {
    payload.shipping_policy = changes.shippingPolicy;
  }
  if (changes.shippingFee !== undefined) {
    payload.shipping_fee = changes.shippingFee;
  }
  if (changes.payoutMethod !== undefined) {
    payload.payout_method = changes.payoutMethod;
  }
  if (changes.payoutReference !== undefined) {
    payload.payout_reference = changes.payoutReference;
  }

  return apiRequest("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(oldPassword, newPassword) {
  return apiRequest("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
}
