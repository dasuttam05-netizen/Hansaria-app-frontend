import React, { lazy, Suspense, useEffect } from "react";
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

const DashboardPageSafe = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPageSafe }))
);
const LocationManagementPage = lazy(() => import("./pages/LocationManagementPage"));
const EmployeeManagementPage = lazy(() => import("./pages/EmployeeManagementPage"));
const CompanyManagementPage = lazy(() => import("./pages/CompanyManagementPage"));
const CompanyAccountsPage = lazy(() => import("./pages/CompanyAccountsPage"));
const WarehouseManagementPage = lazy(() => import("./pages/WarehouseManagementPage"));
const WarehouseRentBookingPage = lazy(() => import("./pages/WarehouseRentBookingPage"));
const ProductsManagementPage = lazy(() => import("./pages/ProductsManagementPage"));
const InwardPage = lazy(() => import("./pages/InwardPage"));
const InwardReportPage = lazy(() => import("./pages/InwardReportPage"));
const OutwardPage = lazy(() => import("./pages/OutwardPage"));
const PendingAdjustment = lazy(() => import("./pages/PendingAdjustment"));
const ERPReportPage = lazy(() => import("./pages/ERPReportPage"));
const CashReportPage = lazy(() => import("./pages/CashReportPage"));
const ExpensesPendingPage = lazy(() => import("./pages/ExpensesPendingPage"));
const PaltiLorryPage = lazy(() => import("./pages/PaltiLorryPage"));
const SelfLoadingPage = lazy(() => import("./pages/SelfLoadingPage"));
const LocalSalePage = lazy(() => import("./pages/LocalSalePage"));
const ExpenseManagementPage = lazy(() => import("./pages/ExpenseManagementPage"));
const DailyRejectionPage = lazy(() => import("./pages/DailyRejectionPage"));
const VoucherEntryPage = lazy(() => import("./pages/VoucherEntryPage"));

function RouteLoadingFallback() {
  return (
    <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontWeight: 600 }}>
      Loading page...
    </div>
  );
}

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

      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
