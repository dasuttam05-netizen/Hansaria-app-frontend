```jsx
import React, { useEffect } from "react";
import axios from "axios";

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { loadSession } from "./utils/auth";
import SessionIdleGuard from "./components/SessionIdleGuard";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import { DashboardPageSafe } from "./pages/DashboardPage";
import LocationManagementPage from "./pages/LocationManagementPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";
import CompanyAccountsPage from "./pages/CompanyAccountsPage";
import WarehouseManagementPage from "./pages/WarehouseManagementPage";
import WarehouseRentBookingPage from "./pages/WarehouseRentBookingPage";
import ProductsManagementPage from "./pages/ProductsManagementPage";
import InwardPage from "./pages/InwardPage";
import InwardReportPage from "./pages/InwardReportPage";
import OutwardPage from "./pages/OutwardPage";
import PendingAdjustment from "./pages/PendingAdjustment";
import ERPReportPage from "./pages/ERPReportPage";
import CashReportPage from "./pages/CashReportPage";
import ExpensesPendingPage from "./pages/ExpensesPendingPage";
import PaltiLorryPage from "./pages/PaltiLorryPage";
import SelfLoadingPage from "./pages/SelfLoadingPage";
import LocalSalePage from "./pages/LocalSalePage";
import ExpenseManagementPage from "./pages/ExpenseManagementPage";
import DailyRejectionPage from "./pages/DailyRejectionPage";

// Voucher page
import VoucherEntryPage from "./pages/VoucherEntryPage";

function App() {
  useEffect(() => {
    const { token } = loadSession();

    if (token) {
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    // Handle extension messages to prevent
    // "message channel closed" error
    const handleMessage = (request, sender, sendResponse) => {
      sendResponse({ received: true });
      return false;
    };

    if (window.chrome && window.chrome.runtime) {
      window.chrome.runtime.onMessage.addListener(handleMessage);

      return () => {
        try {
          window.chrome.runtime.removeListener(handleMessage);
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }
  }, []);

  return (
    <Router>
      <SessionIdleGuard />

      <Routes>
        {/* Login */}
        <Route
          path="/"
          element={<LoginPage />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<DashboardPageSafe />}
        />

        {/* Location */}
        <Route
          path="/locations"
          element={<LocationManagementPage />}
        />

        {/* Employee */}
        <Route
          path="/employees"
          element={<EmployeeManagementPage />}
        />

        {/* Company */}
        <Route
          path="/companies"
          element={<CompanyManagementPage />}
        />

        {/* Company Accounts */}
        <Route
          path="/company-accounts"
          element={<CompanyAccountsPage />}
        />

        {/* Warehouse */}
        <Route
          path="/warehouses"
          element={<WarehouseManagementPage />}
        />

        {/* Warehouse Rent */}
        <Route
          path="/warehouse-rent-booking"
          element={<WarehouseRentBookingPage />}
        />

        {/* Products */}
        <Route
          path="/products"
          element={<ProductsManagementPage />}
        />

        {/* Inward */}
        <Route
          path="/inward"
          element={<InwardPage />}
        />

        {/* Inward Report */}
        <Route
          path="/inward-report"
          element={<InwardReportPage />}
        />

        {/* Outward */}
        <Route
          path="/outward"
          element={<OutwardPage />}
        />

        {/* Pending Adjustment */}
        <Route
          path="/pending"
          element={<PendingAdjustment />}
        />

        {/* ERP Report */}
        <Route
          path="/erp-report"
          element={<ERPReportPage />}
        />

        {/* Cash Report */}
        <Route
          path="/cash-report"
          element={<CashReportPage />}
        />

        {/* Expenses Pending */}
        <Route
          path="/expenses-pending"
          element={<ExpensesPendingPage />}
        />

        {/* Palti Lorry */}
        <Route
          path="/palti-lorry"
          element={<PaltiLorryPage />}
        />

        {/* Self Loading */}
        <Route
          path="/self-loading"
          element={<SelfLoadingPage />}
        />

        {/* Local Sale */}
        <Route
          path="/local-sale"
          element={<LocalSalePage />}
        />

        {/* Daily Rejection */}
        <Route
          path="/daily-rejections"
          element={<DailyRejectionPage />}
        />

        {/* Daily Rejection - alternate route */}
        <Route
          path="/daily-rejection"
          element={<DailyRejectionPage />}
        />

        {/* Expenses */}
        <Route
          path="/expenses"
          element={
            <ProtectedRoute
              permission={[
                "expense.entry",
                "expense.view",
                "expense.create",
                "expense.edit",
                "expense.delete",
              ]}
            >
              <ExpenseManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Expense Edit */}
        <Route
          path="/expense-edit/:id"
          element={
            <ProtectedRoute
              permission={[
                "expense.entry",
                "expense.view",
                "expense.create",
                "expense.edit",
                "expense.delete",
              ]}
            >
              <ExpenseManagementPage />
            </ProtectedRoute>
          }
        />

        {/* =====================================================
            VOUCHER
            Payment Entry / Receipt Entry /
            Journal Entry / Transport Payment
        ====================================================== */}
        <Route
          path="/voucher"
          element={
            <ProtectedRoute
              permission={[
                "expense.entry",
                "expense.view",
                "expense.create",
                "expense.edit",
              ]}
            >
              <VoucherEntryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
```
