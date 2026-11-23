import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "seller" ? "/seller/dashboard" : "/"}
        replace
      />
    );
  }

  if (
    user.role === "seller" &&
    !user.sellerApproved &&
    location.pathname !== "/seller/dashboard"
  ) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;