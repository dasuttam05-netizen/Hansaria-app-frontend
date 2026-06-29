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

  const getFallbackPath = () => {
    if (hasPermission(user, "dashboard.view")) return "/dashboard";
    if (hasAnyPermission(user, ["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"])) return "/expenses";
    if (hasAnyPermission(user, ["inward.view", "inward.create", "inward.edit", "inward.delete"])) return "/inward";
    if (hasAnyPermission(user, ["outward.view", "outward.create", "outward.edit", "outward.delete"])) return "/outward";
    if (hasPermission(user, "report.inward")) return "/inward-report";
    return "/";
  };

  if (permission && !isAllowed) {
    return <Navigate to={getFallbackPath()} replace />;
  }

  return children;
}
