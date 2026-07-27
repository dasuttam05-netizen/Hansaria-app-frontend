import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";

import LoginPage from "./pages/LoginPage";
import { DashboardPageSafe } from "./pages/DashboardPage";
import LocationManagementPage from "./pages/LocationManagementPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";
import CompanyAccountsPage from "./pages/CompanyAccountsPage";
import WarehouseManagementPage from "./pages/WarehouseManagementPage";
import ProductsManagementPage from "./pages/ProductsManagementPage";
import BuyerNamesManagementPage from "./pages/BuyerNamesManagementPage";
import ConsigneeNamesManagementPage from "./pages/ConsigneeNamesManagementPage";
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
import SessionIdleGuard from "./components/SessionIdleGuard";
import { loadSession } from "./utils/auth";
import { getApiOrigin } from "./utils/api";

// ✅ ONLY ONE IMPORTANT LINE
axios.defaults.baseURL = getApiOrigin();

function AppRoutes() {
  useEffect(() => {
    loadSession();
  }, []);

  return (
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
    </Routes>
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
