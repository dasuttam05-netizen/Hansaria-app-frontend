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

// Voucher
import VoucherEntryPage from "./pages/VoucherEntryPage";

function App() {
  useEffect(() => {
    const { token } = loadSession();

    if (token) {
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    // Handle extension messages safely
    const handleMessage = (
      request,
      sender,
      sendResponse
    ) => {
      try {
        sendResponse({
          received: true,
        });
      } catch (e) {
        // Ignore response errors
      }

      return false;
    };

    if (
      window.chrome &&
      window.chrome.runtime &&
      window.chrome.runtime.onMessage
    ) {
      window.chrome.runtime.onMessage.addListener(
        handleMessage
      );

      return () => {
        try {
          window.chrome.runtime.removeListener(
            handleMessage
          );
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }

    return undefined;
  }, []);

  return (
    <Router>
      <SessionIdleGuard />

      <Routes>
        {/* =====================================================
            LOGIN
        ====================================================== */}
        <Route
          path="/"
          element={<LoginPage />}
        />

        {/* =====================================================
            DASHBOARD
        ====================================================== */}
        <Route
          path="/dashboard"
          element={<DashboardPageSafe />}
        />

        {/* =====================================================
            LOCATION
        ====================================================== */}
        <Route
          path="/locations"
          element={<LocationManagementPage />}
        />

        {/* =====================================================
            EMPLOYEE
        ====================================================== */}
        <Route
          path="/employees"
          element={<EmployeeManagementPage />}
        />

        {/* =====================================================
            COMPANY
        ====================================================== */}
        <Route
          path="/companies"
          element={<CompanyManagementPage />}
        />

        {/* =====================================================
            COMPANY ACCOUNTS
        ====================================================== */}
        <Route
          path="/company-accounts"
          element={<CompanyAccountsPage />}
        />

        {/* =====================================================
            WAREHOUSE
        ====================================================== */}
        <Route
          path="/warehouses"
          element={<WarehouseManagementPage />}
        />

        {/* =====================================================
            WAREHOUSE RENT
        ====================================================== */}
        <Route
          path="/warehouse-rent-booking"
          element={<WarehouseRentBookingPage />}
        />

        {/* =====================================================
            PRODUCTS
        ====================================================== */}
        <Route
          path="/products"
          element={<ProductsManagementPage />}
        />

        {/* =====================================================
            INWARD
        ====================================================== */}
        <Route
          path="/inward"
          element={<InwardPage />}
        />

        {/* =====================================================
            INWARD REPORT
        ====================================================== */}
        <Route
          path="/inward-report"
          element={<InwardReportPage />}
        />

        {/* =====================================================
            OUTWARD
        ====================================================== */}
        <Route
          path="/outward"
          element={<OutwardPage />}
        />

        {/* =====================================================
            PENDING ADJUSTMENT
        ====================================================== */}
        <Route
          path="/pending"
          element={<PendingAdjustment />}
        />

        {/* =====================================================
            ERP REPORT
        ====================================================== */}
        <Route
          path="/erp-report"
          element={<ERPReportPage />}
        />

        {/* =====================================================
            CASH REPORT
        ====================================================== */}
        <Route
          path="/cash-report"
          element={<CashReportPage />}
        />

        {/* =====================================================
            EXPENSES PENDING
        ====================================================== */}
        <Route
          path="/expenses-pending"
          element={<ExpensesPendingPage />}
        />

        {/* =====================================================
            PALTI LORRY
        ====================================================== */}
        <Route
          path="/palti-lorry"
          element={<PaltiLorryPage />}
        />

        {/* =====================================================
            SELF LOADING
        ====================================================== */}
        <Route
          path="/self-loading"
          element={<SelfLoadingPage />}
        />

        {/* =====================================================
            LOCAL SALE
        ====================================================== */}
        <Route
          path="/local-sale"
          element={<LocalSalePage />}
        />

        {/* =====================================================
            DAILY REJECTION
        ====================================================== */}
        <Route
          path="/daily-rejections"
          element={<DailyRejectionPage />}
        />

        <Route
          path="/daily-rejection"
          element={<DailyRejectionPage />}
        />

        {/* =====================================================
            EXPENSES
        ====================================================== */}
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

        {/* =====================================================
            EXPENSE EDIT
        ====================================================== */}
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
            VOUCHER ENTRY

            Dashboard -> Entry -> Voucher

            Supported URLs:
              /voucher
              /voucher?type=payment
              /voucher-entry
              /voucher-entry?type=payment
              /voucher/:type
        ====================================================== */}

        <Route
          path="/voucher"
          element={<VoucherEntryPage />}
        />

        <Route
          path="/voucher-entry"
          element={<VoucherEntryPage />}
        />

        <Route
          path="/voucher/:type"
          element={<VoucherEntryPage />}
        />

        {/* =====================================================
            OPTIONAL FALLBACK

            Unknown route হলে Dashboard-এ নিয়ে যাবে
        ====================================================== */}

        <Route
          path="*"
          element={<DashboardPageSafe />}
        />
      </Routes>
    </Router>
  );
}

export default App;
