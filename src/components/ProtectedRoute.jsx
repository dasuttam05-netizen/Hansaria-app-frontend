import React from "react";
import { Navigate } from "react-router-dom";
import { hasAnyPermission, hasPermission, loadSession } from "../utils/auth";

export default function ProtectedRoute({ children, permission }) {
  const { user } = loadSession();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isAllowed = Array.isArray(permission)
    ? hasAnyPermission(user, permission)
    : hasPermission(user, permission);

  if (permission && !isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
