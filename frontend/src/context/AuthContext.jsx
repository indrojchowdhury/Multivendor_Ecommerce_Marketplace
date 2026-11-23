import { createContext, useContext, useEffect, useState } from "react";
import {
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser,
} from "../api/auth";

const SESSION_KEY = "marketplace_session";
const ACCESS_TOKEN_KEY = "marketplace_access_token";
const REFRESH_TOKEN_KEY = "marketplace_refresh_token";

const AuthContext = createContext(null);

function readJSON(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeUser(user = {}, fallback = {}) {
  const email = (user.email || fallback.email || "").trim().toLowerCase();
  const name = (user.full_name || user.name || fallback.name || email || "").trim();

  return {
    id: user.id ?? fallback.id ?? null,
    name,
    email,
    companyName: user.company_name || fallback.companyName || "",
    companyDescription:
      user.company_description ?? fallback.companyDescription ?? "",
    contactPhone: user.contact_phone ?? fallback.contactPhone ?? "",
    businessAddress: user.business_address ?? fallback.businessAddress ?? "",
    shippingPolicy: user.shipping_policy ?? fallback.shippingPolicy ?? "",
    shippingFee: user.shipping_fee ?? fallback.shippingFee ?? "120.00",
    payoutMethod: user.payout_method ?? fallback.payoutMethod ?? "",
    payoutReference: user.payout_reference ?? fallback.payoutReference ?? "",
    username: user.username || email,
    role: user.role || fallback.role || "customer",
    sellerApproved: user.seller_approved ?? fallback.sellerApproved ?? true,
  };
}

function readStoredUser() {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) return null;

  const saved = readJSON(SESSION_KEY, null);
  return saved ? normalizeUser(saved) : null;
}

function saveSession(user, tokens) {
  const nextUser = normalizeUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));

  if (tokens?.access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  }

  if (tokens?.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());

  useEffect(() => {
    if (!user) {
      clearSession();
    }
  }, [user]);

  async function register(credentials) {
    const normalizedEmail = credentials.email.trim().toLowerCase();

    const response = await registerUser({
      full_name: credentials.name,
      email: normalizedEmail,
      password: credentials.password,
      role: credentials.role,
      company_name: credentials.companyName,
    });

    const newUser = normalizeUser(response.user || {
      email: normalizedEmail,
      name: credentials.name,
    });

    saveSession(newUser, {
      access: response.access,
      refresh: response.refresh,
    });

    setUser(newUser);
  }

  async function login(credentials) {
    const normalizedEmail = credentials.email.trim().toLowerCase();

    const response = await loginUser({
      email: normalizedEmail,
      password: credentials.password,
    });

    const loggedInUser = normalizeUser(response.user || {
      email: normalizedEmail,
      name: credentials.name || normalizedEmail,
    });

    saveSession(loggedInUser, {
      access: response.access,
      refresh: response.refresh,
    });

    setUser(loggedInUser);
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch {
      // Ignore server-side logout errors and clear the local session anyway.
    } finally {
      clearSession();
      setUser(null);
    }
  }

  async function updateProfile(changes) {
    const response = await updateCurrentUser({
      ...changes,
    });
    const updated = normalizeUser(response, user || {});
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch {
      // The server profile is still saved if browser storage is unavailable.
    }
    setUser(updated);
    return updated;
  }

  const value = {
    user,
    register,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
