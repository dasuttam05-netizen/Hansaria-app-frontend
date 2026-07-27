import React, { useEffect } from "react";
import axios from "axios";

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { loadSession } from "./utils/auth";
import SessionIdleGuard from "./components/SessionIdleGuard";

import LoginPage from "./pages/LoginPage";
import { DashboardPageSafe } from "./pages/DashboardPage";
import LocationManagementPage from "./pages/LocationManagementPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";
import CompanyAccountsPage from "./pages/CompanyAccountsPage";
import WarehouseManagementPage from "./pages/WarehouseManagementPage";
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

function App() {

  useEffect(() => {

    const { token } = loadSession();

    if (token) {
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    // Handle extension messages to prevent "message channel closed" error
    const handleMessage = (request, sender, sendResponse) => {
      // Respond immediately to prevent channel timeout
      sendResponse({ received: true });
      return false; // Indicate we've handled the response
    };

    if (window.chrome && window.chrome.runtime) {
      window.chrome.runtime.onMessage.addListener(handleMessage);
      
      return () => {
        try {
          window.chrome.runtime.onMessage.removeListener(handleMessage);
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

        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPageSafe />}
        />

        <Route
          path="/locations"
          element={<LocationManagementPage />}
        />

        <Route
          path="/employees"
          element={<EmployeeManagementPage />}
        />

        <Route
          path="/companies"
          element={<CompanyManagementPage />}
        />

        <Route
          path="/company-accounts"
          element={<CompanyAccountsPage />}
        />

        <Route
          path="/warehouses"
          element={<WarehouseManagementPage />}
        />

        <Route
          path="/products"
          element={<ProductsManagementPage />}
        />

        <Route
          path="/inward"
          element={<InwardPage />}
        />

        <Route
          path="/inward-report"
          element={<InwardReportPage />}
        />

        <Route
          path="/outward"
          element={<OutwardPage />}
        />

        <Route
          path="/pending"
          element={<PendingAdjustment />}
        />

        <Route
          path="/erp-report"
          element={<ERPReportPage />}
        />

        <Route
          path="/cash-report"
          element={<CashReportPage />}
        />

        <Route
          path="/expenses-pending"
          element={<ExpensesPendingPage />}
        />

        <Route
          path="/palti-lorry"
          element={<PaltiLorryPage />}
        />

        <Route
          path="/self-loading"
          element={<SelfLoadingPage />}
        />

        <Route
          path="/local-sale"
          element={<LocalSalePage />}
        />

        <Route
          path="/expense-edit/:id"
          element={<ExpenseManagementPage />}
        />

      </Routes>
    </Router>
  );
}

export default App;
