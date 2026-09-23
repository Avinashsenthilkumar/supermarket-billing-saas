// src/components/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../shared/UI";

// roles: optional list of shop roles allowed; superAdmin: platform admin only
const ProtectedRoute = ({ children, roles, superAdmin = false }) => {
  const { isAuthenticated, loading, can, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PageLoader />
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (superAdmin && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (roles && !can(...roles)) return <Navigate to="/billing" replace />;
  return children;
};

export default ProtectedRoute;
