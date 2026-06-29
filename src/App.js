import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
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
import PartyLedgerReportPage from "./pages/PartyLedgerReportPage";
import PartyStockReportPage from "./pages/PartyStockReportPage";
import WarehouseRentLedgerPage from "./pages/WarehouseRentLedgerPage";
import WarehouseRentDashboard from "./pages/WarehouseRentDashboard";
import OutwardSettlementReportPage from "./pages/OutwardSettlementReportPage";
import OutwardEntryDetailsReportPage from "./pages/OutwardEntryDetailsReportPage";
import TransportManagementPage from "./pages/TransportManagementPage";
import TransportBiltiPage from "./pages/TransportBiltiPage";
import TransportReportPage from "./pages/TransportReportPage";
import ExpenseManagementPage from "./pages/ExpenseManagementPage";
import ExpenseReportPage from "./pages/ExpenseReportPage";
import ExpensePostedInwardPage from "./pages/ExpensePostedInwardPage";
import PaltiLorryPage from "./pages/PaltiLorryPage";
import PaltiLorryAdjustmentReportPage from "./pages/PaltiLorryAdjustmentReportPage";
import SelfLoadingPage from "./pages/SelfLoadingPage";
import LocalSalePage from "./pages/LocalSalePage";
import CashEntriesPage from "./pages/CashEntriesPage";
import MainCashBookPage from "./pages/MainCashBookPage";
import PartiesCashBookPage from "./pages/PartiesCashBookPage";
import EmployeeCashBookPage from "./pages/EmployeeCashBookPage";
import FarmerManagementPage from "./pages/FarmerManagementPage";
import WarehouseTradingPage from "./pages/WarehouseTradingPage";
import ExpensesPendingPage from "./pages/ExpensesPendingPage";
import CashActivityLogPage from "./pages/CashActivityLogPage";
import "./mobile.css";

import ProtectedRoute from "./components/ProtectedRoute";
import { loadSession } from "./utils/auth";
import { getApiOrigin } from "./utils/api";

// ✅ ONLY ONE IMPORTANT LINE
axios.defaults.baseURL = getApiOrigin();

const routeGuard = (permission, element) => (
  <ProtectedRoute permission={permission}>{element}</ProtectedRoute>
);

function AppRoutes() {
  useEffect(() => {
    loadSession();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route path="/dashboard" element={routeGuard("dashboard.view", <DashboardPage />)} />

      <Route path="/locations" element={routeGuard("locations.manage", <LocationManagementPage />)} />

      <Route path="/employees" element={routeGuard("employees.view", <EmployeeManagementPage />)} />

      <Route path="/companies" element={routeGuard("companies.manage", <CompanyManagementPage />)} />

      <Route path="/company-accounts" element={routeGuard("companyAccounts.manage", <CompanyAccountsPage />)} />

      <Route path="/farmers" element={routeGuard(["farmers.view", "farmers.create", "farmers.edit", "farmers.delete"], <FarmerManagementPage />)} />

      <Route path="/warehouses" element={routeGuard("warehouses.manage", <WarehouseManagementPage />)} />

      <Route path="/warehouse-trading" element={routeGuard(["warehouse.trading.view", "warehouse.trading.manage"], <WarehouseTradingPage />)} />

      <Route path="/products" element={routeGuard("products.manage", <ProductsManagementPage />)} />

      <Route path="/inward" element={routeGuard(["inward.view", "inward.create", "inward.edit", "inward.delete"], <InwardPage />)} />

      <Route path="/inward-report" element={routeGuard("report.inward", <InwardReportPage />)} />

      <Route path="/outward" element={routeGuard(["outward.view", "outward.create", "outward.edit", "outward.delete"], <OutwardPage />)} />

      <Route path="/pending" element={routeGuard("adjustment.manage", <PendingAdjustment />)} />

      <Route path="/erp-report" element={routeGuard("report.erp", <ERPReportPage />)} />

      <Route path="/party-ledger-report" element={routeGuard("report.partyLedger", <PartyLedgerReportPage />)} />

      <Route path="/party-stock-report" element={routeGuard("report.partyStock", <PartyStockReportPage />)} />

      <Route path="/warehouse-rent-ledger" element={routeGuard("report.warehouseRentLedger", <WarehouseRentLedgerPage />)} />

      <Route path="/warehouse-rent-dashboard" element={routeGuard("report.warehouseRentMonthEnd", <WarehouseRentDashboard />)} />

      <Route path="/outward-settlement-report" element={routeGuard("report.outwardSettlement", <OutwardSettlementReportPage />)} />

      <Route path="/outward-entry-details-report" element={routeGuard("report.outwardSettlement", <OutwardEntryDetailsReportPage />)} />

      <Route path="/transport-management" element={routeGuard("transport.manage", <TransportManagementPage />)} />

      <Route path="/transport-bilti" element={routeGuard("transport.manage", <TransportBiltiPage />)} />

      <Route path="/transport-report" element={routeGuard("transport.manage", <TransportReportPage />)} />

      <Route path="/expenses" element={routeGuard(["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"], <ExpenseManagementPage />)} />

      <Route path="/expense-report" element={routeGuard("report.expense", <ExpenseReportPage />)} />

      <Route path="/expense-posted-inward" element={routeGuard("expense.postedInward", <ExpensePostedInwardPage />)} />

      <Route path="/palti-lorry" element={routeGuard("expense.palti", <PaltiLorryPage />)} />

      <Route path="/palti-lorry-adjustment-report" element={routeGuard("report.paltiLorryAdjustment", <PaltiLorryAdjustmentReportPage />)} />

      <Route path="/self-loading" element={routeGuard("expense.selfLoading", <SelfLoadingPage />)} />

      <Route path="/local-sale" element={routeGuard("expense.localSale", <LocalSalePage />)} />

      <Route path="/cash-entries" element={routeGuard("cash.create", <CashEntriesPage />)} />

      <Route path="/expenses-pending" element={routeGuard("expense.pending", <ExpensesPendingPage />)} />

      <Route path="/cash-book" element={routeGuard("cash.mainBook.view", <MainCashBookPage />)} />

      <Route path="/parties-cash-book" element={routeGuard("cash.partiesBook.view", <PartiesCashBookPage />)} />

      <Route path="/employee-cash-book" element={routeGuard("cash.employeeBook.view", <EmployeeCashBookPage />)} />

      <Route path="/cash-activity-logs" element={routeGuard("all", <CashActivityLogPage />)} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
