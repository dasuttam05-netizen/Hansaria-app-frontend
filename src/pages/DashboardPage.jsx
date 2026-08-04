import React, { Component, useState, useEffect, useRef, lazy, Suspense } from "react";
import API from "./axiosInstance";
import { useNavigate } from "react-router-dom";
import logo from "./logo.png";
import { clearSession, hasAnyPermission, hasPermission, loadSession } from "../utils/auth";
import { formatLocalMonthInput } from "../utils/date";
import "./Dashboard.css";

const LocationManagementPage = lazy(() => import("./LocationManagementPage"));
const EmployeeManagementPage = lazy(() => import("./EmployeeManagementPage"));
const CompanyManagementPage = lazy(() => import("./CompanyManagementPage"));
const CompanyAccountsPage = lazy(() => import("./CompanyAccountsPage"));
const WarehouseManagementPage = lazy(() => import("./WarehouseManagementPage"));
const ProductsManagementPage = lazy(() => import("./ProductsManagementPage"));
const InwardPage = lazy(() => import("./InwardPage"));
const OutwardPage = lazy(() => import("./OutwardPage"));
const ExpenseManagementPage = lazy(() => import("./ExpenseManagementPage"));
const ExpenseReportPage = lazy(() => import("./ExpenseReportPage"));
const ConsigneeNamesManagementPage = lazy(() => import("./ConsigneeNamesManagementPage"));
const BuyerNamesManagementPage = lazy(() => import("./BuyerNamesManagementPage"));

import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaWarehouse,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaFileAlt,
  FaChartBar,
  FaBalanceScale,
  FaMoneyBillWave,
  FaUserTag,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaBars,
  FaBell,
  FaLink,
  FaCog,
} from "react-icons/fa";

function DashboardModalFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f172a",
        fontWeight: 600,
      }}
    >
      Loading content...
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const topbarMenusRef = useRef(null);
  const [active, setActive] = useState("Dashboard");
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null);

  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [outwards, setOutwards] = useState([]);
  const [partyStock, setPartyStock] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [totalStock, setTotalStock] = useState(0);
  const [monthEndRentSummary, setMonthEndRentSummary] = useState([]);

  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [showEmployeePopup, setShowEmployeePopup] = useState(false);
  const [showCompanyPopup, setShowCompanyPopup] = useState(false);
  const [showCompanyAccountPopup, setShowCompanyAccountPopup] = useState(false);
  const [showWarehousePopup, setShowWarehousePopup] = useState(false);
  const [showProductsPopup, setShowProductsPopup] = useState(false);
  const [showInwardPopup, setShowInwardPopup] = useState(false);
  const [showOutwardPopup, setShowOutwardPopup] = useState(false);
  const [showExpensePopup, setShowExpensePopup] = useState(false);
  const [showExpenseReportPopup, setShowExpenseReportPopup] = useState(false);
  const [showConsigneeNamesPopup, setShowConsigneeNamesPopup] = useState(false);
  const [showBuyerNamesPopup, setShowBuyerNamesPopup] = useState(false);
  const [showQuickActionsPanel, setShowQuickActionsPanel] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobileHeaderCollapsed, setIsMobileHeaderCollapsed] = useState(false);
  const [openTopbarMenu, setOpenTopbarMenu] = useState(null);
  const [stockReportQuery, setStockReportQuery] = useState("");
  const [stockReportWarehouse, setStockReportWarehouse] = useState("all");

  const [showListPopup, setShowListPopup] = useState({
    show: false,
    title: "",
    data: [],
  });
  const [searchText, setSearchText] = useState("");

  const API_BASE = "/api";
  const currentMonth = formatLocalMonthInput();

  const fetchData = async (currentUser, isActive) => {
    try {
      const payload = await API.get(`${API_BASE}/dashboard`);

      if (!isActive()) {
        return;
      }

      const data = payload?.data || {};
      const normalizedLocations = Array.isArray(data.locations) ? data.locations : [];
      const normalizedEmployees = Array.isArray(data.employees) ? data.employees : [];
      const normalizedCompanies = Array.isArray(data.companies) ? data.companies : [];
      const normalizedCompanyAccounts = Array.isArray(data.companyAccounts) ? data.companyAccounts : [];
      const normalizedWarehouses = Array.isArray(data.warehouses) ? data.warehouses : [];
      const normalizedProducts = Array.isArray(data.products) ? data.products : [];
      const normalizedInwards = Array.isArray(data.inwards) ? data.inwards : [];
      const normalizedOutwards = Array.isArray(data.outwards) ? data.outwards : [];
      const normalizedPartyStock = Array.isArray(data.partyStock) ? data.partyStock : [];
      const normalizedWarehouseStock = Array.isArray(data.warehouseStock) ? data.warehouseStock : [];
      const normalizedMonthEndRentSummary = Array.isArray(data.monthEndRentSummary) ? data.monthEndRentSummary : [];
      const normalizedTotalStock = Number(data.totalStock ?? 0);

      setLocations(normalizedLocations);
      setEmployees(normalizedEmployees);
      setCompanies(normalizedCompanies);
      setCompanyAccounts(normalizedCompanyAccounts);
      setWarehouses(normalizedWarehouses);
      setProducts(normalizedProducts);
      setInwards(normalizedInwards);
      setOutwards(normalizedOutwards);
      setPartyStock(normalizedPartyStock);
      setWarehouseStock(normalizedWarehouseStock);
      setTotalStock(normalizedTotalStock);
      setMonthEndRentSummary(normalizedMonthEndRentSummary);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  useEffect(() => {
    let alive = true;

    const initDashboard = async () => {
      try {
        const { user: sessionUser } = loadSession();
        if (!sessionUser) {
          navigate("/");
          return;
        }

        if (!alive) {
          return;
        }

        setUser(sessionUser);
        setUsername(sessionUser.name || sessionUser.username || "User");
        await fetchData(sessionUser, () => alive);
      } finally {
        if (!alive) {
          return;
        }
      }
    };

    initDashboard();

    return () => {
      alive = false;
    };
  }, [navigate]);

  const canViewFullCashBook = hasAnyPermission(user, [
    "cash.view",
    "cash.mainBook.view",
    "cash.partiesBook.view",
    "cash.employeeBook.view",
  ]);
  const canPostCashOnly = hasPermission(user, "cash.pending.post") && !canViewFullCashBook;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (topbarMenusRef.current && !topbarMenusRef.current.contains(event.target)) {
        setOpenTopbarMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenTopbarMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const toggleTopbarMenu = (menuKey) => {
    setOpenTopbarMenu((current) => (current === menuKey ? null : menuKey));
  };

  const handleTopbarAction = (action) => {
    setOpenTopbarMenu(null);
    action();
  };

  const handleMenuOpen = (title) => {
    setActive(title);
  };

  const handleSubmenuAction = (action) => {
    setShowMobileSidebar(false);
    action();
  };

  const dashboardBoxes = [
    {
      title: "Warehouses",
      color: "#166534",
      accent: "#22c55e",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaWarehouse />,
      data: warehouses.map((w) => w.name),
      count: warehouses.length,
    },
    {
      title: "Companies",
      color: "#c2410c",
      accent: "#f97316",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaBuilding />,
      data: companies.map((c) => c.name),
      count: companies.length,
    },
    {
      title: "Inwards",
      color: "#1d4ed8",
      accent: "#3b82f6",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaFileAlt />,
      data: inwards.map((i) => ({
        id: i.id,
        primary: i.voucher_no || `Inward #${i.id}`,
        date: i.date || "",
        party_name: i.party_name || i.company_name || i.account_name || "-",
        lorry_no: i.lorry_no || "-",
        weight: Number(i.weight || i.quantity || 0),
      })),
      count: inwards.length,
    },
    {
      title: "Outwards",
      color: "#0f766e",
      accent: "#14b8a6",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaBoxOpen />,
      data: outwards.map((o) => ({
        id: o.id,
        primary: o.inv_no || `Outward #${o.id}`,
        date: o.date || "",
        party_name: o.party_name || o.company_name || o.account_name || "-",
        lorry_no: o.lorry_no || "-",
        weight: Number(o.weight || o.quantity || 0),
      })),
      count: outwards.length,
    },
    {
      title: "Employees",
      color: "#7e22ce",
      accent: "#a855f7",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaUsers />,
      data: employees.map((e) => e.name),
      count: employees.length,
    },
    {
      title: "Locations",
      color: "#b45309",
      accent: "#f59e0b",
      surface: "linear-gradient(180deg, #eefbf8 0%, #d6f3ee 100%)",
      icon: <FaMapMarkerAlt />,
      data: locations.map((l) => l.name),
      count: locations.length,
    },
  ];

  const handleBoxClick = (box) => {
    setSearchText("");
    setShowListPopup({
      show: true,
      title: box.title,
      data: box.data || [],
    });
  };

  const rawMenuItems = [
    { title: "Dashboard", icon: <FaHome /> },
    {
      title: "Employee",
      permission: "employees.view",
      icon: <FaUsers />,
      submenu: [
        { label: "Employee Management", permission: "employees.view", action: () => navigate("/employees") },
      ],
    },
    {
      title: "Company Name",
      permission: "companies.manage",
      icon: <FaBuilding />,
      submenu: [
        { label: "Company Management", permission: "companies.manage", action: () => navigate("/companies") },
      ],
    },
    {
      title: "Company Account",
      permission: "companyAccounts.manage",
      icon: <FaBuilding />,
      submenu: [
        {
          label: "Company Account Management",
          permission: "companyAccounts.manage",
          action: () => navigate("/company-accounts"),
        },
      ],
    },
    {
      title: "Location",
      permission: "locations.manage",
      icon: <FaMapMarkerAlt />,
      submenu: [
        { label: "Location Management", permission: "locations.manage", action: () => navigate("/locations") },
      ],
    },
    {
      title: "Warehouse",
      permission: [
        "warehouses.manage",
        "farmers.view",
        "warehouse.trading.purchase.view",
        "warehouse.trading.sale.view",
        "warehouse.trading.payment.view",
        "warehouse.trading.receipt.view",
        "warehouse.trading.journal.view",
        "warehouse.trading.report.sale",
        "warehouse.trading.report.purchase",
        "warehouse.trading.report.profitLoss",
      ],
      icon: <FaWarehouse />,
      submenu: [
        { label: "Warehouse Management", permission: "warehouses.manage", action: () => navigate("/warehouses") },
        { label: "Farmer Master", permission: "farmers.view", action: () => navigate("/farmers") },
        { label: "Purchase Voucher", permission: ["warehouse.trading.purchase.view", "warehouse.trading.purchase.create", "warehouse.trading.purchase.edit", "warehouse.trading.purchase.delete"], action: () => navigate("/warehouse-trading?type=purchase") },
        { label: "Sale Voucher", permission: ["warehouse.trading.sale.view", "warehouse.trading.sale.create", "warehouse.trading.sale.edit", "warehouse.trading.sale.delete"], action: () => navigate("/warehouse-trading?type=sale") },
        { label: "Payment Voucher", permission: ["warehouse.trading.payment.view", "warehouse.trading.payment.create", "warehouse.trading.payment.edit", "warehouse.trading.payment.delete"], action: () => navigate("/warehouse-trading?type=payment") },
        { label: "Receipt Voucher", permission: ["warehouse.trading.receipt.view", "warehouse.trading.receipt.create", "warehouse.trading.receipt.edit", "warehouse.trading.receipt.delete"], action: () => navigate("/warehouse-trading?type=receipt") },
        { label: "Journal Entry", permission: ["warehouse.trading.journal.view", "warehouse.trading.journal.create", "warehouse.trading.journal.edit", "warehouse.trading.journal.delete"], action: () => navigate("/warehouse-trading?type=journal") },
        { label: "Sales Report", permission: "warehouse.trading.report.sale", action: () => navigate("/warehouse-trading?tab=reports&report=sale") },
        { label: "Purchase Report", permission: "warehouse.trading.report.purchase", action: () => navigate("/warehouse-trading?tab=reports&report=purchase") },
        { label: "Profit/Loss", permission: "warehouse.trading.report.profitLoss", action: () => navigate("/warehouse-trading?tab=reports&report=profit-loss") },
        { label: "Stock Report", permission: ["warehouse.trading.purchase.view", "warehouse.trading.sale.view", "warehouse.trading.payment.view", "warehouse.trading.receipt.view", "warehouse.trading.journal.view"], action: () => navigate("/warehouse-trading") },
      ],
    },
    {
      title: "Products",
      permission: "products.manage",
      icon: <FaBoxOpen />,
      submenu: [
        { label: "Products Management", permission: "products.manage", action: () => navigate("/products") },
      ],
    },
    {
      title: "Masters and Admin",
      permission: [
        "employees.view",
        "locations.view",
        "companies.view",
        "companyAccounts.view",
        "products.view",
        "dashboard.view",
      ],
      icon: <FaCog />,
      submenu: [
        { label: "Employees", permission: "employees.view", action: () => navigate("/employees") },
        { label: "Location", permission: "locations.view", action: () => navigate("/locations") },
        { label: "Companies", permission: "companies.view", action: () => navigate("/companies") },
        { label: "Company Accounts", permission: "companyAccounts.view", action: () => navigate("/company-accounts") },
        { label: "Products", permission: "products.view", action: () => navigate("/products") },
      ],
    },
    {
      title: "Entry",
      permission: ["inward.view", "inward.create", "inward.edit", "inward.delete"],
      icon: <FaFileAlt />,
      submenu: [
        {
          label: "Inward Entry",
          permission: ["inward.view", "inward.create", "inward.edit", "inward.delete"],
          action: () => navigate("/inward"),
        },
        {
          label: "Palti Lorry",
          permission: "expense.palti",
          action: () => navigate("/palti-lorry"),
        },
        {
          label: "Self Loading",
          permission: "expense.selfLoading",
          action: () => navigate("/self-loading"),
        },
        {
          label: "Local Sale",
          permission: "expense.localSale",
          action: () => navigate("/local-sale"),
        },
        {
          label: "Outward Entry",
          permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
          action: () => navigate("/outward"),
        },
      ],
    },
    {
      title: "Expense",
      permission: [
        "expense.entry",
        "expense.view",
        "expense.create",
        "expense.edit",
        "expense.delete",
        "expense.postedInward",
        "expense.palti",
        "expense.selfLoading",
        "expense.localSale",
        "report.expense",
      ],
      icon: <FaMoneyBillWave />,
      submenu: [
        {
          label: "Expense Entry",
          permission: ["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"],
          action: () => navigate("/expenses"),
        },
        {
          label: "Expense Page",
          permission: ["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"],
          action: () => navigate("/expenses"),
        },
        {
          label: "Expense to Inward Posted",
          permission: "expense.postedInward",
          action: () => navigate("/expense-posted-inward"),
        },
        {
          label: "Palti Lorry",
          permission: "expense.palti",
          action: () => navigate("/palti-lorry"),
        },
        {
          label: "Self Loading",
          permission: "expense.selfLoading",
          action: () => navigate("/self-loading"),
        },
        {
          label: "Local Sale",
          permission: "expense.localSale",
          action: () => navigate("/local-sale"),
        },
        { label: "Expense Report", permission: "report.expense", action: () => setShowExpenseReportPopup(true) },
      ],
    },
    {
      title: "Cash Book",
      permission: [
        "cash.view",
        "cash.create",
        "cash.edit",
        "cash.delete",
        "cash.pending.post",
        "cash.mainBook.view",
        "cash.partiesBook.view",
        "cash.employeeBook.view",
        "expense.pending",
      ],
      icon: <FaMoneyBillWave />,
      submenu: canPostCashOnly
        ? [
            {
              label: "Expense Approvals",
              permission: "cash.pending.post",
              action: () => navigate("/expenses-pending"),
            },
          ]
        : [
            {
              label: "New Cash Entry",
              permission: "cash.create",
              action: () => navigate("/cash-entries"),
            },
            {
              label: "Expenses Pending",
              permission: "expense.pending",
              action: () => navigate("/expenses-pending"),
            },
            {
              label: "Main Cash Book Report",
              permission: "cash.mainBook.view",
              action: () => navigate("/cash-book"),
            },
            {
              label: "Parties Cash Book Report",
              permission: "cash.partiesBook.view",
              action: () => navigate("/parties-cash-book"),
            },
            {
              label: "Employee Cash Book Report",
              permission: "cash.employeeBook.view",
              action: () => navigate("/employee-cash-book"),
            },
            {
              label: "Cash Activity Logs (Admin)",
              permission: "all",
              action: () => navigate("/cash-activity-logs"),
            },
          ],
    },
    {
      title: "Names",
      permission: ["buyerNames.view", "buyerNames.create", "buyerNames.edit", "buyerNames.delete", "consigneeNames.view", "consigneeNames.create", "consigneeNames.edit", "consigneeNames.delete"],
      icon: <FaUserTag />,
      submenu: [
        {
          label: "Buyer Names",
          permission: ["buyerNames.view", "buyerNames.create", "buyerNames.edit", "buyerNames.delete"],
          action: () => navigate("/buyer-names"),
        },
        {
          label: "Consignee Names",
          permission: ["consigneeNames.view", "consigneeNames.create", "consigneeNames.edit", "consigneeNames.delete"],
          action: () => navigate("/consignee-names"),
        },
      ],
    },
    {
      title: "Transport",
      permission: "transport.manage",
      icon: <FaFileAlt />,
      submenu: [
        { label: "Transport Management", permission: "transport.manage", action: () => navigate("/transport-management") },
        { label: "Create Bilti", permission: "transport.manage", action: () => navigate("/transport-bilti") },
        { label: "Transport Report", permission: "transport.manage", action: () => navigate("/transport-report") },
      ],
    },
    {
      title: "Reports",
      permission: ["report.inward", "report.erp", "report.partyLedger", "report.partyStock", "report.warehouseRentLedger", "report.warehouseRentMonthEnd", "report.outwardSettlement", "report.expense", "report.paltiLorryAdjustment"],
      icon: <FaChartBar />,
      submenu: [
        { label: "Inward Report", permission: "report.inward", action: () => navigate("/inward-report") },
        { label: "ERP Report", permission: "report.erp", action: () => navigate("/erp-report") },
        { label: "Party Ledger Report", permission: "report.partyLedger", action: () => navigate("/party-ledger-report") },
        { label: "Party Stock Report", permission: "report.partyStock", action: () => navigate("/party-stock-report") },
        { label: "Warehouse Rent Ledger", permission: "report.warehouseRentLedger", action: () => navigate("/warehouse-rent-ledger") },
        { label: "Month End Rent Report", permission: "report.warehouseRentMonthEnd", action: () => navigate("/warehouse-rent-dashboard") },
        { label: "Outward Settlement Report", permission: "report.outwardSettlement", action: () => navigate("/outward-settlement-report") },
        { label: "Outward Entry Details", permission: "report.outwardSettlement", action: () => navigate("/outward-entry-details-report") },
        { label: "Expense Report", permission: "report.expense", action: () => navigate("/expense-report") },
        { label: "Palti Lorry Adjustment Report", permission: "report.paltiLorryAdjustment", action: () => navigate("/palti-lorry-adjustment-report") },
        {
          label: "Cash Report",
          permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
          action: () => navigate("/cash-report"),
        },
      ],
    },
  ];

  const menuItems = rawMenuItems
    .filter((item) =>
      !item.permission ||
      (Array.isArray(item.permission)
        ? hasAnyPermission(user, item.permission)
        : hasPermission(user, item.permission))
    )
    .map((item) => ({
      ...item,
      submenu: item.submenu?.filter(
        (sub) =>
          !sub.permission ||
          (Array.isArray(sub.permission)
            ? hasAnyPermission(user, sub.permission)
            : hasPermission(user, sub.permission))
      ),
    }))
    .filter((item) => !item.submenu || item.submenu.length > 0);

  const quickActions = [
    {
      title: "New Inward",
      icon: <FaFileAlt />,
      subtitle: "Add inward entry quickly",
      action: () => setShowInwardPopup(true),
      permission: ["inward.view", "inward.create", "inward.edit", "inward.delete"],
    },
    {
      title: "New Outward",
      icon: <FaBoxOpen />,
      subtitle: "Create outward entry",
      action: () => setShowOutwardPopup(true),
      permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
    },
    {
      title: "Expense Entry",
      icon: <FaMoneyBillWave />,
      subtitle: "Log a new expense",
      action: () => navigate("/expenses"),
      permission: ["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"],
    },
    {
      title: "Employees",
      icon: <FaUsers />,
      subtitle: "Manage employee profiles",
      action: () => navigate("/employees"),
      permission: "employees.view",
    },
    {
      title: "Warehouses",
      icon: <FaWarehouse />,
      subtitle: "Open warehouse setup and trading",
      action: () => navigate(hasAnyPermission(user, ["warehouse.trading.purchase.view", "warehouse.trading.sale.view", "warehouse.trading.payment.view", "warehouse.trading.receipt.view", "warehouse.trading.journal.view"]) ? "/warehouse-trading" : "/warehouses"),
      permission: ["warehouses.manage", "warehouse.trading.purchase.view", "warehouse.trading.sale.view", "warehouse.trading.payment.view", "warehouse.trading.receipt.view", "warehouse.trading.journal.view"],
    },
    {
      title: "Locations",
      icon: <FaMapMarkerAlt />,
      subtitle: "View location settings",
      action: () => navigate("/locations"),
      permission: "locations.manage",
    },
    {
      title: "Reports",
      icon: <FaChartBar />,
      subtitle: "Open reporting dashboard",
      action: () => navigate("/erp-report"),
      permission: ["report.inward", "report.erp", "report.partyLedger", "report.partyStock", "report.warehouseRentLedger", "report.warehouseRentMonthEnd", "report.outwardSettlement", "report.expense", "report.paltiLorryAdjustment"],
    },
    {
      title: "Buyer Names",
      icon: <FaUserTag />,
      subtitle: "Manage buyer list",
      action: () => navigate("/buyer-names"),
      permission: ["buyerNames.view", "buyerNames.create", "buyerNames.edit", "buyerNames.delete"],
    },
    {
      title: "Consignee Names",
      icon: <FaUserTag />,
      subtitle: "Manage consignee list",
      action: () => navigate("/consignee-names"),
      permission: ["consigneeNames.view", "consigneeNames.create", "consigneeNames.edit", "consigneeNames.delete"],
    },
  ];
  const visibleQuickActions = quickActions.filter(
    (item) =>
      !item.permission ||
      (Array.isArray(item.permission)
        ? hasAnyPermission(user, item.permission)
        : hasPermission(user, item.permission))
  );

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, "0")}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${today.getFullYear()}`;

  const filteredList = (showListPopup.data || []).filter((item) => {
    if (item && typeof item === "object") {
      const haystack = [
        item.primary,
        item.date,
        item.party_name,
        item.lorry_no,
        item.weight,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchText.toLowerCase());
    }

    return (item || "").toString().toLowerCase().includes(searchText.toLowerCase());
  });

  const stockReportNeedle = stockReportQuery.trim().toLowerCase();
  const matchesStockSearch = (...values) =>
    !stockReportNeedle ||
    values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(stockReportNeedle);
  const matchesStockWarehouse = (warehouseName) =>
    stockReportWarehouse === "all" || String(warehouseName || "") === stockReportWarehouse;

  const safeWarehouseStock = Array.isArray(warehouseStock) ? warehouseStock : [];

  const groupedWarehouseStock = Object.values(
    safeWarehouseStock.reduce((acc, row) => {
      const warehouseName = String(row.warehouse || row.warehouse_name || "Unknown").trim() || "Unknown";
      if (!acc[warehouseName]) {
        acc[warehouseName] = {
          warehouse: warehouseName,
          stock: 0,
        };
      }
      acc[warehouseName].stock += Number(row.stock ?? row.available_balance_qty ?? row.total_stock ?? 0);
      return acc;
    }, {})
  ).sort((a, b) => b.stock - a.stock);

  const stockWarehouseOptions = Array.from(
    new Set(
      [
        ...safeWarehouseStock.map((row) => row.warehouse),
        ...partyStock.map((row) => row.warehouse_name),
        ...monthEndRentSummary.map((row) => row.warehouse_name),
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredWarehouseStock = groupedWarehouseStock.filter(
    (row) => matchesStockWarehouse(row.warehouse) && matchesStockSearch(row.warehouse, row.stock)
  );

  const filteredCompanyStock = partyStock.filter((row) => {
    const partyName = row.party_name || row.party || row.company_name || row.account_name || "";
    const warehouseName = row.warehouse_name || row.warehouse || "";
    return (
      matchesStockWarehouse(warehouseName) &&
      matchesStockSearch(
        partyName,
        warehouseName,
        row.gross_qty,
        row.available_balance_qty,
        row.total_weight,
        row.balance_qty
      )
    );
  });

  const filteredMonthEndRentSummary = monthEndRentSummary.filter((row) => {
    const rentValue = row.total_rent ?? row.rent_amount ?? row.balance_rent_amount ?? 0;
    const entryCount = row.total_entries ?? row.entries ?? 0;
    return (
      matchesStockWarehouse(row.warehouse_name) &&
      matchesStockSearch(row.party_name, row.warehouse_name, rentValue, entryCount)
    );
  });

  const warehouseWiseRent = Object.values(
    filteredMonthEndRentSummary.reduce((acc, row) => {
      const key = row.warehouse_name || "Unknown";
      if (!acc[key]) {
        acc[key] = {
          warehouse_name: key,
          total_rent: 0,
          total_entries: 0,
        };
      }
      acc[key].total_rent += Number(row.total_rent || 0);
      acc[key].total_entries += Number(row.total_entries || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total_rent - a.total_rent);

  const partyWiseRent = Object.values(
    filteredMonthEndRentSummary.reduce((acc, row) => {
      const key = row.party_name || "Unknown";
      if (!acc[key]) {
        acc[key] = {
          party_name: key,
          total_rent: 0,
          total_entries: 0,
        };
      }
      acc[key].total_rent += Number(row.total_rent || 0);
      acc[key].total_entries += Number(row.total_entries || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total_rent - a.total_rent);

  const totalWarehouseStock = filteredWarehouseStock.reduce(
    (sum, row) => sum + Number(row.stock || 0),
    0
  );

  const totalWarehouseRent = warehouseWiseRent.reduce(
    (sum, row) => sum + Number(row.total_rent || 0),
    0
  );
  const totalPartyRent = partyWiseRent.reduce(
    (sum, row) => sum + Number(row.total_rent || 0),
    0
  );
  const totalRentCollected = filteredMonthEndRentSummary.reduce(
    (sum, row) => sum + Number(row.total_rent ?? row.rent_amount ?? 0),
    0
  );

  const stockCoveragePercentage = totalStock > 0 ? Math.round(Math.min(100, (totalWarehouseStock / totalStock) * 100)) : 0;
  const expenseBalanceRatio = totalRentCollected > 0 ? Math.round(Math.min(100, (totalWarehouseRent / totalRentCollected) * 100)) : 0;
  const aiInsights = [
    {
      title: "Inventory trend",
      detail: stockCoveragePercentage >= 80 ? "Healthy stock balance" : "Monitor weak inventory lanes",
      value: `${stockCoveragePercentage}%`,
    },
    {
      title: "Rent pulse",
      detail: expenseBalanceRatio >= 70 ? "Stable warehouse rent" : "Watch high party rent variance",
      value: `${expenseBalanceRatio}%`,
    },
    {
      title: "Operational signal",
      detail: warehouses.length > 5 ? "Multi-warehouse growth" : "Focused warehouse control",
      value: warehouses.length,
    },
  ];

  const analyticsSparkline = {
    stock: [58, 72, 81, 73, 88],
    rent: [42, 55, 64, 58, 70],
    health: [82, 86, 90, 88, 94],
    expense: [35, 49, 43, 57, 50],
  };

  const notificationItems = [
    {
      label: `${inwards.length} inward entries available`,
      meta: "Latest entry updates are ready to review.",
    },
    {
      label: `${outwards.length} outward entries available`,
      meta: "Outward records can be checked from this dashboard.",
    },
    {
      label: `${warehouses.length} warehouses mapped`,
      meta: "Warehouse summary is synced with current records.",
    },
  ];

  const quickLinkItems = [
    {
      label: "Open Inward Entry",
      meta: "Directly open the inward full screen page.",
      action: () => setShowInwardPopup(true),
      permission: ["inward.view", "inward.create", "inward.edit", "inward.delete"],
    },
    {
      label: "Open Outward Entry",
      meta: "Directly open the outward full screen page.",
      action: () => setShowOutwardPopup(true),
      permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
    },
    {
      label: "Open Expense Report",
      meta: "Jump to expense reporting quickly.",
      action: () => setShowExpenseReportPopup(true),
      permission: "report.expense",
    },
  ];
  const visibleQuickLinkItems = quickLinkItems.filter(
    (item) =>
      !item.permission ||
      (Array.isArray(item.permission)
        ? hasAnyPermission(user, item.permission)
        : hasPermission(user, item.permission))
  );

  const canViewResourceOverview = hasAnyPermission(user, [
    "warehouses.manage",
    "warehouse.trading.view",
    "companies.manage",
    "companyAccounts.manage",
    "employees.view",
    "locations.manage",
    "locations.manage",
    "inward.view",
    "inward.create",
    "outward.view",
    "outward.create",
    "inward.view",
    "outward.view",
  ]);

  const canViewStockReport = hasAnyPermission(user, [
    "report.partyStock",
    "report.warehouseRentLedger",
    "report.warehouseRentMonthEnd",
    "warehouse.trading.purchase.view",
    "warehouse.trading.sale.view",
    "warehouse.trading.payment.view",
    "warehouse.trading.receipt.view",
    "warehouse.trading.journal.view",
  ]);

  const canViewDashboardOverview = canViewResourceOverview || canViewStockReport;

  const settingsItems = [
    {
      label: "Profile Summary",
      meta: username || "Current user account",
      action: () => setActive("Dashboard"),
    },
    {
      label: "Quick Actions",
      meta: "Open the right-side action panel.",
      action: () => setShowQuickActionsPanel(true),
    },
    {
      label: "Logout",
      meta: "Exit the current session safely.",
      action: handleLogout,
      danger: true,
    },
  ];

  const partyStockSummary = Object.values(
    filteredCompanyStock.reduce((acc, row) => {
      const key = row.party_name || row.party || row.company_name || row.account_name || "Unknown";
      if (!acc[key]) {
        acc[key] = {
          party_name: key,
          gross_qty: 0,
          shortage_qty: 0,
          net_opening_qty: 0,
          already_adjusted_qty: 0,
          available_balance_qty: 0,
        };
      }
      acc[key].gross_qty += Number(row.gross_qty ?? row.total_weight ?? 0);
      acc[key].shortage_qty += Number(row.shortage_qty ?? 0);
      acc[key].net_opening_qty += Number(row.net_opening_qty ?? row.balance_qty ?? 0);
      acc[key].already_adjusted_qty += Number(row.already_adjusted_qty ?? 0);
      acc[key].available_balance_qty += Number(row.available_balance_qty ?? row.balance_qty ?? row.stock ?? 0);
      return acc;
    }, {})
  ).sort((a, b) => b.available_balance_qty - a.available_balance_qty);
  const assignedWarehouseNames = Array.isArray(user?.assigned_warehouses)
    ? user.assigned_warehouses.map((item) => item?.name).filter(Boolean)
    : [];

  // Dashboard-only report cards; no external report page navigation from this section.

  return (
    <div className="dashboard-shell">
      <div
        className={`dashboard-sidebar-overlay ${showMobileSidebar ? "is-visible" : ""}`}
        onClick={() => setShowMobileSidebar(false)}
      />
      <aside className={`dashboard-sidebar ${showMobileSidebar ? "is-open" : ""}`}>
        <div>
          <h2 className="dashboard-brand">Warehouse ERP</h2>

          <ul className="sidebar-nav">
            {menuItems.map((item) => (
              <React.Fragment key={item.title}>
                <li
                  onClick={() => handleMenuOpen(item.title)}
                  className={`sidebar-nav-item ${active === item.title ? "active" : ""}`}
                >
                  {item.icon}
                  {item.title}
                  {item.submenu && <span style={{ marginLeft: "auto", fontSize: "12px" }}>▸</span>}
                </li>

                {active === item.title && item.submenu && (
                  <ul className="sidebar-submenu">
                    {item.submenu.map((sub) => (
                      <li
                        key={sub.label}
                        onClick={() => handleSubmenuAction(sub.action)}
                        className="sidebar-submenu-item"
                      >
                        {sub.label}
                      </li>
                    ))}
                  </ul>
                )}
              </React.Fragment>
            ))}
          </ul>
        </div>

        <div className="dashboard-sidebar-footer">{formattedDate}</div>
      </aside>

      <main className="dashboard-main">
        <div className={`dashboard-topbar ${isMobileHeaderCollapsed ? "is-mobile-collapsed" : ""}`}>
          <div className="dashboard-topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setShowMobileSidebar(true)}
              title="Open menu"
            >
              <FaBars />
            </button>
            <button
              type="button"
              className="mobile-header-toggle"
              onClick={() => {
                setIsMobileHeaderCollapsed((prev) => !prev);
                setOpenTopbarMenu(null);
              }}
              title={isMobileHeaderCollapsed ? "Show header" : "Hide header"}
            >
              {isMobileHeaderCollapsed ? <FaChevronDown /> : <FaChevronUp />}
            </button>
            <img src={logo} alt="Logo" className="dashboard-logo" />
            <div className="dashboard-topbar-info">
              <h3>Welcome, {username}</h3>
              <div className="topbar-meta-row">
                <span className="topbar-badge topbar-badge-role">
                  {(user?.role || "staff").toUpperCase()} access
                </span>
                <span className="topbar-badge topbar-badge-warehouse">
                  Warehouse: {assignedWarehouseNames.join(", ") || "Not assigned"}
                </span>
              </div>
            </div>
          </div>

          <div className="topbar-action-group" ref={topbarMenusRef}>
            <div className="topbar-menu-wrap">
              <button
                type="button"
                className={`topbar-link-btn ${openTopbarMenu === "notifications" ? "is-active" : ""}`}
                onClick={() => toggleTopbarMenu("notifications")}
              >
                <FaBell />
                Notifications
              </button>
              {openTopbarMenu === "notifications" && (
                <div className="topbar-dropdown">
                  <div className="topbar-dropdown-header">Recent Notifications</div>
                  {notificationItems.map((item) => (
                    <div key={item.label} className="topbar-dropdown-item is-static">
                      <span className="topbar-dropdown-title">{item.label}</span>
                      <span className="topbar-dropdown-meta">{item.meta}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-menu-wrap">
              <button
                type="button"
                className={`topbar-link-btn ${openTopbarMenu === "quick-links" ? "is-active" : ""}`}
                onClick={() => toggleTopbarMenu("quick-links")}
              >
                <FaLink />
                Quick Links
              </button>
              {openTopbarMenu === "quick-links" && (
                <div className="topbar-dropdown">
                  <div className="topbar-dropdown-header">Quick Open</div>
                  {visibleQuickLinkItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="topbar-dropdown-item"
                      onClick={() => handleTopbarAction(item.action)}
                    >
                      <span className="topbar-dropdown-title">{item.label}</span>
                      <span className="topbar-dropdown-meta">{item.meta}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-menu-wrap">
              <button
                type="button"
                className={`topbar-link-btn ${openTopbarMenu === "settings" ? "is-active" : ""}`}
                onClick={() => toggleTopbarMenu("settings")}
              >
                <FaCog />
                Settings
              </button>
              {openTopbarMenu === "settings" && (
                <div className="topbar-dropdown">
                  <div className="topbar-dropdown-header">Settings Shortcuts</div>
                  {settingsItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`topbar-dropdown-item ${item.danger ? "is-danger" : ""}`}
                      onClick={() => handleTopbarAction(item.action)}
                    >
                      <span className="topbar-dropdown-title">{item.label}</span>
                      <span className="topbar-dropdown-meta">{item.meta}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {canViewDashboardOverview ? (
          <section className="dashboard-panel hero-panel">
            <div>
              <span className="eyebrow">Dashboard</span>
              <h1>Warehouse ERP Overview</h1>
              <p>Manage inventory, entries, and reports from one smart dashboard.</p>
            </div>
            <div className="hero-stat hero-stat-grid">
              <div className="hero-stat-item">
                <span>Total Stock</span>
                <strong>{Number(totalWarehouseStock).toFixed(2)}</strong>
              </div>
              <div className="hero-stat-item">
                <span>Total Rent</span>
                <strong>₹{Number(totalRentCollected || 0).toFixed(2)}</strong>
              </div>
              <div className="hero-stat-item">
                <span>Warehouse</span>
                <strong>{warehouses.length}</strong>
              </div>
            </div>
          </section>
          ) : (
          <section className="dashboard-panel hero-panel">
            <div>
              <span className="eyebrow">Workspace</span>
              <h1>Expense Workspace</h1>
              <p>You can use only the modules granted in your access list.</p>
            </div>
          </section>
          )}

          {canViewDashboardOverview ? (
          <section className="dashboard-section analytics-section">
            <div className="section-header">
              <div>
                <h2>Premium Analytics</h2>
                <p>Live warehouse, stock and expense analytics with AI-powered insights.</p>
              </div>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card glass-card">
                <div className="analytics-card-head">
                  <span>Warehouse Analytics</span>
                  <strong>Real-time capacity status</strong>
                </div>
                <div className="analytics-card-value">{filteredWarehouseStock.length}</div>
                <div className="analytics-card-text">Active warehouse groups contributing to current stock.</div>
                <div className="sparkline-row">
                  {analyticsSparkline.health.map((value, idx) => (
                    <span key={idx} className="sparkline-segment" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>

              <div className="analytics-card glass-card">
                <div className="analytics-card-head">
                  <span>Stock Analytics</span>
                  <strong>Inventory utilization</strong>
                </div>
                <div className="analytics-card-value">{stockCoveragePercentage}%</div>
                <div className="analytics-card-text">Stock health score based on warehouse availability vs total coverage.</div>
                <div className="sparkline-row">
                  {analyticsSparkline.stock.map((value, idx) => (
                    <span key={idx} className="sparkline-segment" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>

              <div className="analytics-card glass-card">
                <div className="analytics-card-head">
                  <span>Expense Analytics</span>
                  <strong>Rent and expense balance</strong>
                </div>
                <div className="analytics-card-value">₹{Number(totalRentCollected || 0).toFixed(2)}</div>
                <div className="analytics-card-text">Current rent exposure and expense flow across your warehouses.</div>
                <div className="sparkline-row">
                  {analyticsSparkline.expense.map((value, idx) => (
                    <span key={idx} className="sparkline-segment" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>

              <div className="ai-insights-panel glass-card">
                <div className="analytics-card-head">
                  <span>AI Insights</span>
                  <strong>Suggested actions</strong>
                </div>
                <div className="insights-list">
                  {aiInsights.map((item, idx) => (
                    <div key={idx} className="insight-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <div className="insight-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {canViewResourceOverview ? (
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Resource Overview</h2>
                <p>Quick snapshot of available entities.</p>
              </div>
            </div>

            <div className="metric-grid">
              {dashboardBoxes.map((box, index) => (
                <div
                  key={index}
                  className="overview-card"
                  onClick={() => handleBoxClick(box)}
                  style={{
                    "--overview-surface": box.surface,
                    "--overview-icon-color": box.color,
                    "--overview-icon-surface": `color-mix(in srgb, ${box.accent || box.color} 88%, white 12%)`,
                    "--overview-icon-surface-deep": `color-mix(in srgb, ${box.color} 88%, black 12%)`,
                    "--overview-icon-border": `color-mix(in srgb, ${box.color} 72%, white 28%)`,
                    "--overview-icon-shadow": `color-mix(in srgb, ${box.color} 38%, transparent 62%)`,
                  }}
                >
                  <div className="overview-head-simple">
                    <div className="overview-icon">
                      {box.icon}
                    </div>
                    <div className="overview-text">
                      <div className="title">{box.title}</div>
                      <div className="overview-count">{box.count} Entities.</div>
                    </div>
                  </div>
                  <div className="overview-arrow" aria-hidden="true">
                    <FaChevronRight />
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {canViewStockReport ? (
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Stock Report</h2>
                <p>Warehouse and company stock details side by side, using formula: inward - shortage - adjusted qty.</p>
              </div>
            </div>

            <div className="dashboard-panel table-card" style={{ padding: "18px" }}>
              <div className="report-highlight-row" style={{ marginBottom: "14px" }}>
                <div className="report-highlight-card">
                  <span>Total Available Stock</span>
                  <strong>{Number(totalWarehouseStock).toFixed(2)}</strong>
                </div>
                <div className="report-highlight-card">
                  <span>Total Current Rent</span>
                  <strong>{Number(totalRentCollected).toFixed(2)}</strong>
                </div>
              </div>

              <div className="stock-report-filter-panel">
                <div className="stock-filter-field stock-filter-search">
                  <span>Search</span>
                  <input
                    type="search"
                    value={stockReportQuery}
                    onChange={(event) => setStockReportQuery(event.target.value)}
                    placeholder="Party, warehouse, amount..."
                  />
                </div>
                <div className="stock-filter-field">
                  <span>Warehouse</span>
                  <select
                    value={stockReportWarehouse}
                    onChange={(event) => setStockReportWarehouse(event.target.value)}
                  >
                    <option value="all">All Warehouses</option>
                    {stockWarehouseOptions.map((warehouseName) => (
                      <option key={warehouseName} value={warehouseName}>
                        {warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stock-filter-summary">
                  <span>{filteredWarehouseStock.length} stock rows</span>
                  <span>{filteredMonthEndRentSummary.length} rent rows</span>
                </div>
                <button
                  type="button"
                  className="stock-filter-reset"
                  onClick={() => {
                    setStockReportQuery("");
                    setStockReportWarehouse("all");
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="dashboard-report-grid">
                <div className="report-module">
                  <div className="report-card-header report-card-header-inline">
                    <div>
                      <h3>Warehouse Stock</h3>
                      <p>Top warehouse balances across the system.</p>
                    </div>
                    <div className="report-metric-row">
                      <div className="report-metric-stat">
                        <span>Warehouses</span>
                        <strong>{filteredWarehouseStock.length}</strong>
                      </div>
                      <div className="report-metric-stat">
                        <span>Total Stock</span>
                        <strong>{Number(totalWarehouseStock).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="report-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>S.L No</th>
                          <th>Warehouse</th>
                          <th>Available Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWarehouseStock.length > 0 ? filteredWarehouseStock.slice(0, 6).map((row, idx) => (
                          <tr key={row.warehouse || idx}>
                            <td>{idx + 1}</td>
                            <td>{row.warehouse}</td>
                            <td className="table-value-cell">{Number(row.stock || 0).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3">No warehouse stock data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="report-module">
                  <div className="report-card-header report-card-header-inline">
                    <div>
                      <h3>Party Stock</h3>
                      <p>Stock exposure grouped by party, showing available balances.</p>
                    </div>
                    <div className="report-metric-row">
                      <div className="report-metric-stat">
                        <span>Parties</span>
                        <strong>{partyStockSummary.length}</strong>
                      </div>
                      <div className="report-metric-stat">
                        <span>Rows</span>
                        <strong>{filteredCompanyStock.length}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="report-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>S.L No</th>
                          <th>Party</th>
                          <th>Available Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partyStockSummary.length > 0 ? partyStockSummary.slice(0, 6).map((row, idx) => (
                          <tr key={row.party_name || idx}>
                            <td>{idx + 1}</td>
                            <td>{row.party_name}</td>
                            <td className="table-value-cell">{Number(row.available_balance_qty || 0).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3">No party stock data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="report-module">
                  <div className="report-card-header report-card-header-inline">
                    <div>
                      <h3>Warehouse Rent</h3>
                      <p>Rent collected by warehouse for the selected month.</p>
                    </div>
                    <div className="report-metric-row">
                      <div className="report-metric-stat">
                        <span>Warehouses</span>
                        <strong>{warehouseWiseRent.length}</strong>
                      </div>
                      <div className="report-metric-stat">
                        <span>Total Rent</span>
                        <strong>₹{Number(totalWarehouseRent).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="report-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>S.L No</th>
                          <th>Warehouse</th>
                          <th>Total Rent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseWiseRent.length > 0 ? warehouseWiseRent.slice(0, 6).map((row, idx) => (
                          <tr key={`${row.warehouse_name}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{row.warehouse_name}</td>
                            <td className="table-value-cell">₹{Number(row.total_rent || 0).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3">No warehouse rent data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="report-module">
                  <div className="report-card-header report-card-header-inline">
                    <div>
                      <h3>Party Rent</h3>
                      <p>Rent totals grouped by party, without leaving the dashboard.</p>
                    </div>
                    <div className="report-metric-row">
                      <div className="report-metric-stat">
                        <span>Parties</span>
                        <strong>{partyWiseRent.length}</strong>
                      </div>
                      <div className="report-metric-stat">
                        <span>Rent Total</span>
                        <strong>₹{Number(totalPartyRent).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="report-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>S.L No</th>
                          <th>Party</th>
                          <th>Total Rent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partyWiseRent.length > 0 ? partyWiseRent.slice(0, 6).map((row, idx) => (
                          <tr key={`${row.party_name}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{row.party_name}</td>
                            <td className="table-value-cell">₹{Number(row.total_rent || 0).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3">No party rent data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
          ) : null}
        </div>
      </main>

      <button
        type="button"
        className={`quick-actions-fab ${showQuickActionsPanel ? "is-open" : ""}`}
        onClick={() => setShowQuickActionsPanel((prev) => !prev)}
        title="Quick Actions"
      >
        <span className="quick-actions-fab-text">Quick Actions</span>
        <span className="quick-actions-fab-icon">
          {showQuickActionsPanel ? <FaChevronRight /> : <FaChevronLeft />}
        </span>
      </button>

      <div
        className={`quick-actions-overlay ${showQuickActionsPanel ? "is-visible" : ""}`}
        onClick={() => setShowQuickActionsPanel(false)}
      />

      <aside className={`quick-actions-drawer ${showQuickActionsPanel ? "is-open" : ""}`}>
        <div className="quick-actions-drawer-header">
          <div>
            <span className="eyebrow">Action Center</span>
            <h3>Quick Actions</h3>
            <p>Common workflows ready to open from the right side.</p>
          </div>
          <button
            type="button"
            className="quick-actions-close"
            onClick={() => setShowQuickActionsPanel(false)}
            title="Close Quick Actions"
          >
            <FaChevronRight />
          </button>
        </div>

        <div className="quick-actions-drawer-body">
          {visibleQuickActions.map((item, idx) => (
            <div
              key={item.title}
              className="shortcut-card quick-actions-card"
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => {
                setShowQuickActionsPanel(false);
                item.action();
              }}
            >
              <div className="shortcut-label">
                {item.icon}
                {item.title}
              </div>
              <div className="shortcut-description">{item.subtitle}</div>
              <button type="button" className="shortcut-action">
                Open
              </button>
            </div>
          ))}
        </div>
      </aside>

      {showLocationPopup && (
        <ModalWrapper onClose={() => setShowLocationPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <LocationManagementPage locations={locations} />
          </Suspense>
        </ModalWrapper>
      )}
      {showEmployeePopup && (
        <ModalWrapper onClose={() => setShowEmployeePopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <EmployeeManagementPage employees={employees} />
          </Suspense>
        </ModalWrapper>
      )}
      {showCompanyPopup && (
        <ModalWrapper onClose={() => setShowCompanyPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <CompanyManagementPage companies={companies} />
          </Suspense>
        </ModalWrapper>
      )}
      {showCompanyAccountPopup && (
        <ModalWrapper onClose={() => setShowCompanyAccountPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <CompanyAccountsPage accounts={companyAccounts} />
          </Suspense>
        </ModalWrapper>
      )}
      {showWarehousePopup && (
        <ModalWrapper onClose={() => setShowWarehousePopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <WarehouseManagementPage warehouses={warehouses} />
          </Suspense>
        </ModalWrapper>
      )}
      {showProductsPopup && (
        <ModalWrapper onClose={() => setShowProductsPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <ProductsManagementPage products={products} />
          </Suspense>
        </ModalWrapper>
      )}

      {showInwardPopup && (
        <FullScreenModal onClose={() => setShowInwardPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <InwardPage />
          </Suspense>
        </FullScreenModal>
      )}

      {showOutwardPopup && (
        <FullScreenModal onClose={() => setShowOutwardPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <OutwardPage />
          </Suspense>
        </FullScreenModal>
      )}

      {showExpensePopup && (
        <FullScreenModal onClose={() => setShowExpensePopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <ExpenseManagementPage />
          </Suspense>
        </FullScreenModal>
      )}

      {showExpenseReportPopup && (
        <FullScreenModal onClose={() => setShowExpenseReportPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <ExpenseReportPage />
          </Suspense>
        </FullScreenModal>
      )}

      {showConsigneeNamesPopup && (
        <ModalWrapper onClose={() => setShowConsigneeNamesPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <ConsigneeNamesManagementPage />
          </Suspense>
        </ModalWrapper>
      )}

      {showBuyerNamesPopup && (
        <ModalWrapper onClose={() => setShowBuyerNamesPopup(false)}>
          <Suspense fallback={<DashboardModalFallback />}>
            <BuyerNamesManagementPage />
          </Suspense>
        </ModalWrapper>
      )}

      {showListPopup.show && (
        <ModalWrapper onClose={() => setShowListPopup({ show: false, title: "", data: [] })}>
          <h3 style={{ marginTop: 0 }}>{showListPopup.title} List</h3>
          <input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
          {showListPopup.title === "Inwards" || showListPopup.title === "Outwards" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    border: "1px solid #dbe4ea",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    background:
                      showListPopup.title === "Inwards"
                        ? "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)"
                        : "linear-gradient(180deg, #f4fffb 0%, #e9f9f2 100%)",
                    boxShadow:
                      showListPopup.title === "Inwards"
                        ? "0 8px 18px rgba(37, 99, 235, 0.08)"
                        : "0 8px 18px rgba(15, 118, 110, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <div
                      style={{
                        fontWeight: 800,
                        color: showListPopup.title === "Inwards" ? "#1e3a8a" : "#0f766e",
                        fontSize: "14px",
                      }}
                    >
                      {item.primary}
                    </div>
                    <div
                      style={{
                        padding: "4px 8px",
                        borderRadius: "999px",
                        background: showListPopup.title === "Inwards" ? "#dbeafe" : "#ccfbf1",
                        color: showListPopup.title === "Inwards" ? "#1d4ed8" : "#0f766e",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {item.weight?.toFixed ? item.weight.toFixed(2) : Number(item.weight || 0).toFixed(2)} MT
                    </div>
                  </div>
                  <div style={{ marginTop: "8px", color: "#334155", fontSize: "13px", lineHeight: 1.6 }}>
                    <div><strong>Date:</strong> {item.date || "-"}</div>
                    <div><strong>Party:</strong> {item.party_name || "-"}</div>
                    <div><strong>Lorry No:</strong> {item.lorry_no || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul style={{ paddingLeft: "18px", margin: 0 }}>
              {filteredList.map((item, idx) => (
                <li key={idx} style={{ marginBottom: "8px" }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </ModalWrapper>
      )}
    </div>
  );

}

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Dashboard render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
            color: "#0f172a",
            fontFamily: "Segoe UI, Arial, sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: "22px 26px",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
              maxWidth: 520,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Dashboard could not load</div>
            <div style={{ color: "#64748b", fontSize: 14 }}>
              Something in the dashboard view crashed. Please refresh the page.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DashboardPageSafe() {
  return (
    <DashboardErrorBoundary>
      <DashboardPage />
    </DashboardErrorBoundary>
  );
}

const tableHead = {
  background: "#0f766e",
  color: "#fff",
  padding: "10px 12px",
  border: "1px solid #dbe4ea",
  textAlign: "left",
};

const tableCell = {
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  background: "#fff",
};

function ModalWrapper({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "16px",
          maxHeight: "90%",
          overflowY: "auto",
          width: "90%",
          maxWidth: "900px",
          position: "relative",
          boxShadow: "0 20px 50px rgba(15,23,42,0.2)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            border: "none",
            background: "#ef4444",
            color: "#fff",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          X
        </button>
        {children}
      </div>
    </div>
  );
}

function FullScreenModal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        zIndex: 1000,
        paddingTop: "10px",
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "98%",
          height: "98%",
          padding: "20px 30px",
          borderRadius: "16px",
          overflowY: "auto",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          X
        </button>
        {children}
      </div>
    </div>
  );
}
