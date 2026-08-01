import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";

import "./mobile.css";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPageSafe = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPageSafe })));
const LocationManagementPage = lazy(() => import("./pages/LocationManagementPage"));
const EmployeeManagementPage = lazy(() => import("./pages/EmployeeManagementPage"));
const CompanyManagementPage = lazy(() => import("./pages/CompanyManagementPage"));
const CompanyAccountsPage = lazy(() => import("./pages/CompanyAccountsPage"));
const WarehouseManagementPage = lazy(() => import("./pages/WarehouseManagementPage"));
const ProductsManagementPage = lazy(() => import("./pages/ProductsManagementPage"));
const BuyerNamesManagementPage = lazy(() => import("./pages/BuyerNamesManagementPage"));
const ConsigneeNamesManagementPage = lazy(() => import("./pages/ConsigneeNamesManagementPage"));
const InwardPage = lazy(() => import("./pages/InwardPage"));
const InwardReportPage = lazy(() => import("./pages/InwardReportPage"));
const OutwardPage = lazy(() => import("./pages/OutwardPage"));
const PendingAdjustment = lazy(() => import("./pages/PendingAdjustment"));
const ERPReportPage = lazy(() => import("./pages/ERPReportPage"));
const PartyLedgerReportPage = lazy(() => import("./pages/PartyLedgerReportPage"));
const PartyStockReportPage = lazy(() => import("./pages/PartyStockReportPage"));
const WarehouseRentLedgerPage = lazy(() => import("./pages/WarehouseRentLedgerPage"));
const WarehouseRentDashboard = lazy(() => import("./pages/WarehouseRentDashboard"));
const OutwardSettlementReportPage = lazy(() => import("./pages/OutwardSettlementReportPage"));
const OutwardEntryDetailsReportPage = lazy(() => import("./pages/OutwardEntryDetailsReportPage"));
const TransportManagementPage = lazy(() => import("./pages/TransportManagementPage"));
const TransportBiltiPage = lazy(() => import("./pages/TransportBiltiPage"));
const TransportReportPage = lazy(() => import("./pages/TransportReportPage"));
const ExpenseManagementPage = lazy(() => import("./pages/ExpenseManagementPage"));
const ExpenseReportPage = lazy(() => import("./pages/ExpenseReportPage"));
const ExpensePostedInwardPage = lazy(() => import("./pages/ExpensePostedInwardPage"));
const PaltiLorryPage = lazy(() => import("./pages/PaltiLorryPage"));
const PaltiLorryAdjustmentReportPage = lazy(() => import("./pages/PaltiLorryAdjustmentReportPage"));
const SelfLoadingPage = lazy(() => import("./pages/SelfLoadingPage"));
const LocalSalePage = lazy(() => import("./pages/LocalSalePage"));
const CashEntriesPage = lazy(() => import("./pages/CashEntriesPage"));
const MainCashBookPage = lazy(() => import("./pages/MainCashBookPage"));
const PartiesCashBookPage = lazy(() => import("./pages/PartiesCashBookPage"));
const EmployeeCashBookPage = lazy(() => import("./pages/EmployeeCashBookPage"));
const FarmerManagementPage = lazy(() => import("./pages/FarmerManagementPage"));
const WarehouseTradingPage = lazy(() => import("./pages/WarehouseTradingPage"));
const ExpensesPendingPage = lazy(() => import("./pages/ExpensesPendingPage"));
const CashActivityLogPage = lazy(() => import("./pages/CashActivityLogPage"));

import ProtectedRoute from "./components/ProtectedRoute";
import SessionIdleGuard from "./components/SessionIdleGuard";
import { loadSession } from "./utils/auth";
import { getApiOrigin } from "./utils/api";

// ✅ ONLY ONE IMPORTANT LINE
axios.defaults.baseURL = getApiOrigin();

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#0f172a",
        fontSize: "15px",
        fontWeight: 600,
      }}
    >
      Loading page...
    </div>
  );
}

function AppRoutes() {
  useEffect(() => {
    loadSession();
  }, []);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission="dashboard.view">
            <DashboardPageSafe />
          </ProtectedRoute>
        }
      />

      <Route
        path="/locations"
        element={
          <ProtectedRoute permission="locations.manage">
            <LocationManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedRoute permission="employees.view">
            <EmployeeManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute permission={["companies.view", "companies.create", "companies.edit", "companies.delete"]}>
            <CompanyManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/company-accounts"
        element={
          <ProtectedRoute permission={["companyAccounts.view", "companyAccounts.create", "companyAccounts.edit", "companyAccounts.delete"]}>
            <CompanyAccountsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/buyer-names"
        element={
          <ProtectedRoute permission={["buyerNames.view", "buyerNames.create", "buyerNames.edit", "buyerNames.delete"]}>
            <BuyerNamesManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/consignee-names"
        element={
          <ProtectedRoute permission={["consigneeNames.view", "consigneeNames.create", "consigneeNames.edit", "consigneeNames.delete"]}>
            <ConsigneeNamesManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/farmers"
        element={
          <ProtectedRoute permission={["farmers.view", "farmers.create", "farmers.edit", "farmers.delete"]}>
            <FarmerManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouses"
        element={
          <ProtectedRoute permission="warehouses.manage">
            <WarehouseManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouse-trading"
        element={
          <ProtectedRoute permission={[
            "warehouse.trading.view",
            "warehouse.trading.manage",
            "warehouse.trading.purchase.view",
            "warehouse.trading.purchase.create",
            "warehouse.trading.purchase.edit",
            "warehouse.trading.purchase.delete",
            "warehouse.trading.sale.view",
            "warehouse.trading.sale.create",
            "warehouse.trading.sale.edit",
            "warehouse.trading.sale.delete",
            "warehouse.trading.payment.view",
            "warehouse.trading.payment.create",
            "warehouse.trading.payment.edit",
            "warehouse.trading.payment.delete",
            "warehouse.trading.receipt.view",
            "warehouse.trading.receipt.create",
            "warehouse.trading.receipt.edit",
            "warehouse.trading.receipt.delete",
            "warehouse.trading.journal.view",
            "warehouse.trading.journal.create",
            "warehouse.trading.journal.edit",
            "warehouse.trading.journal.delete",
            "warehouse.trading.report.sale",
            "warehouse.trading.report.purchase",
            "warehouse.trading.report.profitLoss",
          ]}>
            <WarehouseTradingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute permission={["products.view", "products.create", "products.edit", "products.delete"]}>
            <ProductsManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inward"
        element={
          <ProtectedRoute permission={["inward.view", "inward.create", "inward.edit", "inward.delete"]}>
            <InwardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inward-report"
        element={
          <ProtectedRoute permission="report.inward">
            <InwardReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/outward"
        element={
          <ProtectedRoute permission={["outward.view", "outward.create", "outward.edit", "outward.delete"]}>
            <OutwardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pending"
        element={
          <ProtectedRoute permission="adjustment.manage">
            <PendingAdjustment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/erp-report"
        element={
          <ProtectedRoute permission="report.erp">
            <ERPReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/party-ledger-report"
        element={
          <ProtectedRoute permission="report.partyLedger">
            <PartyLedgerReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/party-stock-report"
        element={
          <ProtectedRoute permission="report.partyStock">
            <PartyStockReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouse-rent-ledger"
        element={
          <ProtectedRoute permission="report.warehouseRentLedger">
            <WarehouseRentLedgerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouse-rent-dashboard"
        element={
          <ProtectedRoute permission="report.warehouseRentMonthEnd">
            <WarehouseRentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/outward-settlement-report"
        element={
          <ProtectedRoute permission="report.outwardSettlement">
            <OutwardSettlementReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/outward-entry-details-report"
        element={
          <ProtectedRoute permission="report.outwardSettlement">
            <OutwardEntryDetailsReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transport-management"
        element={
          <ProtectedRoute permission="transport.manage">
            <TransportManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transport-bilti"
        element={
          <ProtectedRoute permission="transport.manage">
            <TransportBiltiPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transport-report"
        element={
          <ProtectedRoute permission="transport.manage">
            <TransportReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute permission={["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"]}>
            <ExpenseManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expense-report"
        element={
          <ProtectedRoute permission="report.expense">
            <ExpenseReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expense-posted-inward"
        element={
          <ProtectedRoute permission="expense.postedInward">
            <ExpensePostedInwardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/palti-lorry"
        element={
          <ProtectedRoute permission="expense.palti">
            <PaltiLorryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/palti-lorry-adjustment-report"
        element={
          <ProtectedRoute permission="report.paltiLorryAdjustment">
            <PaltiLorryAdjustmentReportPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/self-loading"
        element={
          <ProtectedRoute permission="expense.selfLoading">
            <SelfLoadingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/local-sale"
        element={
          <ProtectedRoute permission="expense.localSale">
            <LocalSalePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash-entries"
        element={
          <ProtectedRoute permission="cash.create">
            <CashEntriesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses-pending"
        element={
          <ProtectedRoute permission={["expense.pending", "cash.pending.post"]}>
            <ExpensesPendingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash-book"
        element={
          <ProtectedRoute permission="cash.mainBook.view">
            <MainCashBookPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/parties-cash-book"
        element={
          <ProtectedRoute permission="cash.partiesBook.view">
            <PartiesCashBookPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-cash-book"
        element={
          <ProtectedRoute permission="cash.employeeBook.view">
            <EmployeeCashBookPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash-activity-logs"
        element={
          <ProtectedRoute permission="all">
            <CashActivityLogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute permission={["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"]}>
            <ExpenseManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expense-edit/:id"
        element={
          <ProtectedRoute permission={["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"]}>
            <ExpenseManagementPage />
          </ProtectedRoute>
        }
      />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <SessionIdleGuard />
      <AppRoutes />
    </Router>
  );
}

export default App;
