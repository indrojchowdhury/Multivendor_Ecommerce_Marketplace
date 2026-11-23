
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import WishlistPage from "./pages/WishlistPage";
import SellerDashboardPage from "./pages/SellerDashboardPage";
import SellerProductsPage from "./pages/SellerProductsPage";
import SellerProductFormPage from "./pages/SellerProductFormPage";
import SellerSettingsPage from "./pages/SellerSettingsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function CustomerOnlyRoute({ children }) {
  const { user } = useAuth();

  if (user?.role === "seller") {
    return <Navigate to="/seller/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <CustomerOnlyRoute>
                  <CartPage />
                </CustomerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <CustomerOnlyRoute>
                  <WishlistPage />
                </CustomerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/order-confirmation/:orderId"
            element={
              <ProtectedRoute allowedRoles={["customer", "admin"]}>
                <OrderConfirmationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/products"
            element={
              <ProtectedRoute allowedRoles={["seller", "admin"]}>
                <SellerProductsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/products/new"
            element={
              <ProtectedRoute allowedRoles={["seller", "admin"]}>
                <SellerProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/products/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["seller", "admin"]}>
                <SellerProductFormPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/settings"
            element={
              <ProtectedRoute allowedRoles={["seller", "admin"]}>
                <SellerSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Seller Dashboard */}
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRoute allowedRoles={["seller", "admin"]}>
                <SellerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
