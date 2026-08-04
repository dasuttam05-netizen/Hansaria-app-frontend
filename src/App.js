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

const preloadRouteModules = () => {
  if (typeof window === "undefined") {
    return;
  }

  const run = () => {
    const loaders = [
      () => import("./pages/LoginPage"),
      () => import("./pages/DashboardPage"),
      () => import("./pages/LocationManagementPage"),
      () => import("./pages/EmployeeManagementPage"),
      () => import("./pages/CompanyManagementPage"),
      () => import("./pages/CompanyAccountsPage"),
      () => import("./pages/WarehouseManagementPage"),
      () => import("./pages/ProductsManagementPage"),
      () => import("./pages/BuyerNamesManagementPage"),
      () => import("./pages/ConsigneeNamesManagementPage"),
      () => import("./pages/InwardPage"),
      () => import("./pages/InwardReportPage"),
      () => import("./pages/OutwardPage"),
      () => import("./pages/PendingAdjustment"),
      () => import("./pages/ERPReportPage"),
      () => import("./pages/PartyLedgerReportPage"),
      () => import("./pages/PartyStockReportPage"),
      () => import("./pages/WarehouseRentLedgerPage"),
      () => import("./pages/WarehouseRentDashboard"),
      () => import("./pages/OutwardSettlementReportPage"),
      () => import("./pages/OutwardEntryDetailsReportPage"),
      () => import("./pages/TransportManagementPage"),
      () => import("./pages/TransportBiltiPage"),
      () => import("./pages/TransportReportPage"),
      () => import("./pages/ExpenseManagementPage"),
      () => import("./pages/ExpenseReportPage"),
      () => import("./pages/ExpensePostedInwardPage"),
      () => import("./pages/PaltiLorryPage"),
      () => import("./pages/PaltiLorryAdjustmentReportPage"),
      () => import("./pages/SelfLoadingPage"),
      () => import("./pages/LocalSalePage"),
      () => import("./pages/CashEntriesPage"),
      () => import("./pages/MainCashBookPage"),
      () => import("./pages/PartiesCashBookPage"),
      () => import("./pages/EmployeeCashBookPage"),
      () => import("./pages/FarmerManagementPage"),
      () => import("./pages/WarehouseTradingPage"),
      () => import("./pages/ExpensesPendingPage"),
      () => import("./pages/CashActivityLogPage"),
    ];

    loaders.forEach((loader) => {
      loader().catch(() => {});
    });
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 300);
  }
};

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

  const routes = [
    { path: "/", element: <LoginPage /> },
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute permission="dashboard.view">
          <DashboardPageSafe />
        </ProtectedRoute>
      ),
    },
    {
      path: "/locations",
      element: (
        <ProtectedRoute permission="locations.manage">
          <LocationManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/employees",
      element: (
        <ProtectedRoute permission="employees.view">
          <EmployeeManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/companies",
      element: (
        <ProtectedRoute permission={["companies.view", "companies.create", "companies.edit", "companies.delete"]}>
          <CompanyManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/company-accounts",
      element: (
        <ProtectedRoute permission={["companyAccounts.view", "companyAccounts.create", "companyAccounts.edit", "companyAccounts.delete"]}>
          <CompanyAccountsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/buyer-names",
      element: (
        <ProtectedRoute permission={["buyerNames.view", "buyerNames.create", "buyerNames.edit", "buyerNames.delete"]}>
          <BuyerNamesManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/consignee-names",
      element: (
        <ProtectedRoute permission={["consigneeNames.view", "consigneeNames.create", "consigneeNames.edit", "consigneeNames.delete"]}>
          <ConsigneeNamesManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/farmers",
      element: (
        <ProtectedRoute permission={["farmers.view", "farmers.create", "farmers.edit", "farmers.delete"]}>
          <FarmerManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/warehouses",
      element: (
        <ProtectedRoute permission="warehouses.manage">
          <WarehouseManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/warehouse-trading",
      element: (
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
      ),
    },
    {
      path: "/products",
      element: (
        <ProtectedRoute permission={["products.view", "products.create", "products.edit", "products.delete"]}>
          <ProductsManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/inward",
      element: (
        <ProtectedRoute permission={["inward.view", "inward.create", "inward.edit", "inward.delete"]}>
          <InwardPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/inward-report",
      element: (
        <ProtectedRoute permission="report.inward">
          <InwardReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/outward",
      element: (
        <ProtectedRoute permission={["outward.view", "outward.create", "outward.edit", "outward.delete"]}>
          <OutwardPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/pending",
      element: (
        <ProtectedRoute permission="adjustment.manage">
          <PendingAdjustment />
        </ProtectedRoute>
      ),
    },
    {
      path: "/erp-report",
      element: (
        <ProtectedRoute permission="report.erp">
          <ERPReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/party-ledger-report",
      element: (
        <ProtectedRoute permission="report.partyLedger">
          <PartyLedgerReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/party-stock-report",
      element: (
        <ProtectedRoute permission="report.partyStock">
          <PartyStockReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/warehouse-rent-ledger",
      element: (
        <ProtectedRoute permission="report.warehouseRentLedger">
          <WarehouseRentLedgerPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/warehouse-rent-dashboard",
      element: (
        <ProtectedRoute permission="report.warehouseRentMonthEnd">
          <WarehouseRentDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/outward-settlement-report",
      element: (
        <ProtectedRoute permission="report.outwardSettlement">
          <OutwardSettlementReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/outward-entry-details-report",
      element: (
        <ProtectedRoute permission="report.outwardSettlement">
          <OutwardEntryDetailsReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/transport-management",
      element: (
        <ProtectedRoute permission="transport.manage">
          <TransportManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/transport-bilti",
      element: (
        <ProtectedRoute permission="transport.manage">
          <TransportBiltiPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/transport-report",
      element: (
        <ProtectedRoute permission="transport.manage">
          <TransportReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/expenses",
      element: (
        <ProtectedRoute permission={["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"]}>
          <ExpenseManagementPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/expense-report",
      element: (
        <ProtectedRoute permission="report.expense">
          <ExpenseReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/expense-posted-inward",
      element: (
        <ProtectedRoute permission="expense.postedInward">
          <ExpensePostedInwardPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/palti-lorry",
      element: (
        <ProtectedRoute permission="expense.palti">
          <PaltiLorryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/palti-lorry-adjustment-report",
      element: (
        <ProtectedRoute permission="report.paltiLorryAdjustment">
          <PaltiLorryAdjustmentReportPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/self-loading",
      element: (
        <ProtectedRoute permission="expense.selfLoading">
          <SelfLoadingPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/local-sale",
      element: (
        <ProtectedRoute permission="expense.localSale">
          <LocalSalePage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/cash-entries",
      element: (
        <ProtectedRoute permission="cash.create">
          <CashEntriesPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/expenses-pending",
      element: (
        <ProtectedRoute permission={["expense.pending", "cash.pending.post"]}>
          <ExpensesPendingPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/cash-book",
      element: (
        <ProtectedRoute permission="cash.mainBook.view">
          <MainCashBookPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/parties-cash-book",
      element: (
        <ProtectedRoute permission="cash.partiesBook.view">
          <PartiesCashBookPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/employee-cash-book",
      element: (
        <ProtectedRoute permission="cash.employeeBook.view">
          <EmployeeCashBookPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/cash-activity-logs",
      element: (
        <ProtectedRoute permission="all">
          <CashActivityLogPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/expense-edit/:id",
      element: (
        <ProtectedRoute permission={["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"]}>
          <ExpenseManagementPage />
        </ProtectedRoute>
      ),
    },
  ];

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    loadSession();
    preloadRouteModules();
  }, []);

  return (
    <Router>
      <SessionIdleGuard />
      <AppRoutes />
    </Router>
  );
}

export default App;
