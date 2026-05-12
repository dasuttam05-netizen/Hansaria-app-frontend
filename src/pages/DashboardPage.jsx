import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "./logo.png";
import { clearSession, hasAnyPermission, hasPermission, loadSession } from "../utils/auth";
import "./Dashboard.css";

import LocationManagementPage from "./LocationManagementPage";
import EmployeeManagementPage from "./EmployeeManagementPage";
import CompanyManagementPage from "./CompanyManagementPage";
import CompanyAccountsPage from "./CompanyAccountsPage";
import WarehouseManagementPage from "./WarehouseManagementPage";
import ProductsManagementPage from "./ProductsManagementPage";
import InwardPage from "./InwardPage";
import OutwardPage from "./OutwardPage";
import ExpenseManagementPage from "./ExpenseManagementPage";
import ExpenseReportPage from "./ExpenseReportPage";
import ConsigneeNamesManagementPage from "./ConsigneeNamesManagementPage";
import BuyerNamesManagementPage from "./BuyerNamesManagementPage";

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
  FaBars,
  FaBell,
  FaLink,
  FaCog,
} from "react-icons/fa";

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
  const [openTopbarMenu, setOpenTopbarMenu] = useState(null);
  const [activeStockTab, setActiveStockTab] = useState("warehouse_stock");

  const [showListPopup, setShowListPopup] = useState({
    show: false,
    title: "",
    data: [],
  });
  const [searchText, setSearchText] = useState("");

  const API_BASE = "/api";
  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchData = async (currentUser) => {
    try {
      const canLoadStockInsights = hasAnyPermission(currentUser, [
        "report.partyStock",
        "report.warehouseRentLedger",
        "report.warehouseRentMonthEnd",
        "warehouses.manage",
      ]);

      const requests = [
        hasPermission(currentUser, "locations.manage")
          ? axios.get(`${API_BASE}/locations`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "employees.view")
          ? axios.get(`${API_BASE}/employees`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "companies.manage")
          ? axios.get(`${API_BASE}/companies`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "companyAccounts.manage")
          ? axios.get(`${API_BASE}/company-accounts`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "warehouses.manage")
          ? axios.get(`${API_BASE}/warehouses`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "products.manage")
          ? axios.get(`${API_BASE}/products`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "inward.manage")
          ? axios.get(`${API_BASE}/inward`)
          : Promise.resolve({ data: [] }),
        hasPermission(currentUser, "outward.manage")
          ? axios.get(`${API_BASE}/outward`)
          : Promise.resolve({ data: [] }),
        canLoadStockInsights
          ? axios.get(`${API_BASE}/reports/party-stock`)
          : Promise.resolve({ data: { summary: [] } }),
        canLoadStockInsights
          ? axios.get(`${API_BASE}/reports/warehouse-stock`)
          : Promise.resolve({ data: [] }),
        canLoadStockInsights
          ? axios.get(`${API_BASE}/reports/total-stock`)
          : Promise.resolve({ data: { total: 0 } }),
        canLoadStockInsights
          ? axios.get(`${API_BASE}/reports/warehouse-rent-month-end`, {
              params: { month: currentMonth },
            })
          : Promise.resolve({ data: { summary: [] } }),
      ];

      const [
        locRes,
        empRes,
        compRes,
        compAccRes,
        wareRes,
        prodRes,
        inwardRes,
        outwardRes,
        partyStockRes,
        warehouseStockRes,
        totalStockRes,
        monthEndRentRes,
      ] = await Promise.all(requests);

      setLocations(locRes.data || []);
      setEmployees(empRes.data || []);
      setCompanies(compRes.data || []);
      setCompanyAccounts(compAccRes.data || []);
      setWarehouses(wareRes.data || []);
      setProducts(prodRes.data || []);
      setInwards(inwardRes.data || []);
      setOutwards(outwardRes.data || []);
      setPartyStock(partyStockRes.data?.summary || []);
      setWarehouseStock(warehouseStockRes.data || []);
      setTotalStock(Number(totalStockRes?.data?.total || 0));
      setMonthEndRentSummary(monthEndRentRes?.data?.summary || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  useEffect(() => {
    const { user: sessionUser } = loadSession();
    if (!sessionUser) {
      navigate("/");
    } else {
      setUser(sessionUser);
      setUsername(sessionUser.name || sessionUser.username || "User");
      fetchData(sessionUser);
    }
  }, [navigate]);

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
        { label: "Employee Management", permission: "employees.view", action: () => setShowEmployeePopup(true) },
      ],
    },
    {
      title: "Company Name",
      permission: "companies.manage",
      icon: <FaBuilding />,
      submenu: [
        { label: "Company Management", permission: "companies.manage", action: () => setShowCompanyPopup(true) },
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
          action: () => setShowCompanyAccountPopup(true),
        },
      ],
    },
    {
      title: "Location",
      permission: "locations.manage",
      icon: <FaMapMarkerAlt />,
      submenu: [
        { label: "Location Management", permission: "locations.manage", action: () => setShowLocationPopup(true) },
      ],
    },
    {
      title: "Warehouse",
      permission: "warehouses.manage",
      icon: <FaWarehouse />,
      submenu: [
        { label: "Warehouse Management", permission: "warehouses.manage", action: () => setShowWarehousePopup(true) },
      ],
    },
    {
      title: "Products",
      permission: "products.manage",
      icon: <FaBoxOpen />,
      submenu: [
        { label: "Products Management", permission: "products.manage", action: () => setShowProductsPopup(true) },
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
          action: () => setShowInwardPopup(true),
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
          action: () => setShowOutwardPopup(true),
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
          action: () => setShowExpensePopup(true),
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
      permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
      icon: <FaMoneyBillWave />,
      submenu: [
        {
          label: "New Cash Entry",
          permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
          action: () => navigate("/cash-entries"),
        },
        {
          label: "Expenses Pending",
          permission: "expense.pending",
          action: () => navigate("/expenses-pending"),
        },
        {
          label: "Main Cash Book Report",
          permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
          action: () => navigate("/cash-book"),
        },
        {
          label: "Parties Cash Book Report",
          permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
          action: () => navigate("/parties-cash-book"),
        },
        {
          label: "Employee Cash Book Report",
          permission: ["cash.view", "cash.create", "cash.edit", "cash.delete"],
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
      permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
      icon: <FaUserTag />,
      submenu: [
        {
          label: "Buyer Names",
          permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
          action: () => setShowBuyerNamesPopup(true),
        },
        {
          label: "Consignee Names",
          permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
          action: () => setShowConsigneeNamesPopup(true),
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
      action: () => setShowExpensePopup(true),
      permission: ["expense.entry", "expense.view", "expense.create", "expense.edit", "expense.delete"],
    },
    {
      title: "Employees",
      icon: <FaUsers />,
      subtitle: "Manage employee profiles",
      action: () => setShowEmployeePopup(true),
      permission: "employees.view",
    },
    {
      title: "Warehouses",
      icon: <FaWarehouse />,
      subtitle: "Manage warehouse data",
      action: () => setShowWarehousePopup(true),
      permission: "warehouses.manage",
    },
    {
      title: "Locations",
      icon: <FaMapMarkerAlt />,
      subtitle: "View location settings",
      action: () => setShowLocationPopup(true),
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
      action: () => setShowBuyerNamesPopup(true),
      permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
    },
    {
      title: "Consignee Names",
      icon: <FaUserTag />,
      subtitle: "Manage consignee list",
      action: () => setShowConsigneeNamesPopup(true),
      permission: ["outward.view", "outward.create", "outward.edit", "outward.delete"],
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

  const warehouseWiseRent = Object.values(
    monthEndRentSummary.reduce((acc, row) => {
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
    monthEndRentSummary.reduce((acc, row) => {
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

  const totalWarehouseStock = warehouseStock.reduce(
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
  const totalRentCollected = monthEndRentSummary.reduce(
    (sum, row) => sum + Number(row.total_rent || 0),
    0
  );

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
    "companies.manage",
    "employees.view",
    "locations.manage",
    "inward.view",
    "outward.view",
  ]);

  const canViewStockReport = hasAnyPermission(user, [
    "report.partyStock",
    "report.warehouseRentLedger",
    "report.warehouseRentMonthEnd",
    "warehouses.manage",
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
    partyStock.reduce((acc, row) => {
      const key = row.party_name || row.party || "Unknown";
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
      acc[key].gross_qty += Number(row.gross_qty || 0);
      acc[key].shortage_qty += Number(row.shortage_qty || 0);
      acc[key].net_opening_qty += Number(row.net_opening_qty || 0);
      acc[key].already_adjusted_qty += Number(row.already_adjusted_qty || 0);
      acc[key].available_balance_qty += Number(row.available_balance_qty || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.available_balance_qty - a.available_balance_qty);
  const assignedWarehouseNames = (user?.assigned_warehouses || []).map((item) => item.name);

  const openPartyStockReport = () => navigate("/party-stock-report");
  const openMonthEndRentReport = () => navigate("/warehouse-rent-dashboard");
  const openWarehouseStockDetails = (warehouseName) => {
    const matchedWarehouse = warehouses.find((item) => item.name === warehouseName);
    if (matchedWarehouse?.id) {
      navigate(`/party-stock-report?warehouse_id=${matchedWarehouse.id}&dashboard_view=1`);
      return;
    }
    navigate("/party-stock-report");
  };
  const openCompanyStockDetails = (partyName, warehouseName) => {
    const matchedCompany = companies.find((item) => item.name === partyName);
    const matchedWarehouse = warehouses.find((item) => item.name === warehouseName);
    const params = new URLSearchParams();

    if (matchedCompany?.id) params.set("company_id", matchedCompany.id);
    if (matchedWarehouse?.id) params.set("warehouse_id", matchedWarehouse.id);
    params.set("dashboard_view", "1");

    navigate(`/party-stock-report${params.toString() ? `?${params.toString()}` : ""}`);
  };
  const openWarehouseRentDetails = (warehouseName) => {
    const matchedWarehouse = warehouses.find((item) => item.name === warehouseName);
    const params = new URLSearchParams();
    params.set("month", currentMonth);
    if (matchedWarehouse?.id) params.set("warehouse_id", matchedWarehouse.id);
    params.set("dashboard_view", "1");
    navigate(`/warehouse-rent-dashboard?${params.toString()}`);
  };
  const openPartyRentDetails = (partyName) => {
    const matchedCompany = companies.find((item) => item.name === partyName);
    const params = new URLSearchParams();
    params.set("month", currentMonth);
    if (matchedCompany?.id) params.set("company_id", matchedCompany.id);
    params.set("dashboard_view", "1");
    navigate(`/warehouse-rent-dashboard?${params.toString()}`);
  };

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
        <div className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setShowMobileSidebar(true)}
              title="Open menu"
            >
              <FaBars />
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
                <strong>{Number(totalStock).toFixed(2)}</strong>
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
                  <strong>{Number(totalWarehouseRent + totalPartyRent).toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {[
                  { key: "warehouse_stock", label: "Warehouse Stock" },
                  { key: "party_stock", label: "Party Stock" },
                  { key: "company_stock", label: "Company Stock" },
                  { key: "warehouse_rent", label: "Warehouse Rent" },
                  { key: "party_rent", label: "Party Rent" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveStockTab(tab.key)}
                    style={{
                      border: "1px solid #14b8a6",
                      background: activeStockTab === tab.key ? "#0f766e" : "#ecfeff",
                      color: activeStockTab === tab.key ? "#fff" : "#0f766e",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeStockTab === "warehouse_stock" ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>S.L No</th>
                        <th>Warehouse</th>
                        <th>Available Stock</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseStock.length > 0 ? warehouseStock.slice(0, 5).map((row, idx) => (
                        <tr key={row.warehouse || idx}>
                          <td>{idx + 1}</td>
                          <td>{row.warehouse}</td>
                          <td className="table-value-cell">{Number(row.stock || 0).toFixed(2)}</td>
                          <td>
                            <button type="button" className="table-view-button" onClick={() => openWarehouseStockDetails(row.warehouse)}>
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="4">No warehouse stock data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStockTab === "party_stock" ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>S.L No</th>
                        <th>Party Name</th>
                        <th>Gross Qty</th>
                        <th>Shortage</th>
                        <th>Net Opening</th>
                        <th>Adjusted</th>
                        <th>Available Balance</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyStockSummary.length > 0 ? partyStockSummary.slice(0, 5).map((row, idx) => (
                        <tr key={row.party_name || idx}>
                          <td>{idx + 1}</td>
                          <td>{row.party_name}</td>
                          <td className="table-value-cell">{Number(row.gross_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.shortage_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.net_opening_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.already_adjusted_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.available_balance_qty || 0).toFixed(2)}</td>
                          <td>
                            <button type="button" className="table-view-button" onClick={() => openCompanyStockDetails(row.party_name, "")}>
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="8">No party stock data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStockTab === "company_stock" ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>S.L No</th>
                        <th>Party Name</th>
                        <th>Warehouse</th>
                        <th>Gross Qty</th>
                        <th>Shortage</th>
                        <th>Net Opening</th>
                        <th>Adjusted</th>
                        <th>Available Balance</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyStock.length > 0 ? partyStock.slice(0, 5).map((row, idx) => (
                        <tr key={`${row.party_name || row.party}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{row.party_name || row.party}</td>
                          <td>{row.warehouse_name || "-"}</td>
                          <td className="table-value-cell">{Number(row.gross_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.shortage_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.net_opening_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.already_adjusted_qty || 0).toFixed(2)}</td>
                          <td className="table-value-cell">{Number(row.available_balance_qty || 0).toFixed(2)}</td>
                          <td>
                            <button type="button" className="table-view-button" onClick={() => openCompanyStockDetails(row.party_name || row.party, row.warehouse_name || "")}>
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="9">No stock data found</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStockTab === "warehouse_rent" ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>S.L No</th>
                        <th>Warehouse</th>
                        <th>Entries</th>
                        <th>Total Rent</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseWiseRent.length > 0 ? warehouseWiseRent.slice(0, 5).map((row, idx) => (
                        <tr key={`${row.warehouse_name}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{row.warehouse_name}</td>
                          <td>{row.total_entries}</td>
                          <td className="table-value-cell">{Number(row.total_rent || 0).toFixed(2)}</td>
                          <td>
                            <button type="button" className="table-view-button" onClick={() => openWarehouseRentDetails(row.warehouse_name)}>
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="5">No warehouse rent data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {activeStockTab === "party_rent" ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>S.L No</th>
                        <th>Party</th>
                        <th>Entries</th>
                        <th>Total Rent</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyWiseRent.length > 0 ? partyWiseRent.slice(0, 5).map((row, idx) => (
                        <tr key={`${row.party_name}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{row.party_name}</td>
                          <td>{row.total_entries}</td>
                          <td className="table-value-cell">{Number(row.total_rent || 0).toFixed(2)}</td>
                          <td>
                            <button type="button" className="table-view-button" onClick={() => openPartyRentDetails(row.party_name)}>
                              <FaEye />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="5">No party rent data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : null}
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
          <LocationManagementPage locations={locations} />
        </ModalWrapper>
      )}
      {showEmployeePopup && (
        <ModalWrapper onClose={() => setShowEmployeePopup(false)}>
          <EmployeeManagementPage employees={employees} />
        </ModalWrapper>
      )}
      {showCompanyPopup && (
        <ModalWrapper onClose={() => setShowCompanyPopup(false)}>
          <CompanyManagementPage companies={companies} />
        </ModalWrapper>
      )}
      {showCompanyAccountPopup && (
        <ModalWrapper onClose={() => setShowCompanyAccountPopup(false)}>
          <CompanyAccountsPage accounts={companyAccounts} />
        </ModalWrapper>
      )}
      {showWarehousePopup && (
        <ModalWrapper onClose={() => setShowWarehousePopup(false)}>
          <WarehouseManagementPage warehouses={warehouses} />
        </ModalWrapper>
      )}
      {showProductsPopup && (
        <ModalWrapper onClose={() => setShowProductsPopup(false)}>
          <ProductsManagementPage products={products} />
        </ModalWrapper>
      )}

      {showInwardPopup && (
        <FullScreenModal onClose={() => setShowInwardPopup(false)}>
          <InwardPage />
        </FullScreenModal>
      )}

      {showOutwardPopup && (
        <FullScreenModal onClose={() => setShowOutwardPopup(false)}>
          <OutwardPage />
        </FullScreenModal>
      )}

      {showExpensePopup && (
        <FullScreenModal onClose={() => setShowExpensePopup(false)}>
          <ExpenseManagementPage />
        </FullScreenModal>
      )}

      {showExpenseReportPopup && (
        <FullScreenModal onClose={() => setShowExpenseReportPopup(false)}>
          <ExpenseReportPage />
        </FullScreenModal>
      )}

      {showConsigneeNamesPopup && (
        <ModalWrapper onClose={() => setShowConsigneeNamesPopup(false)}>
          <ConsigneeNamesManagementPage />
        </ModalWrapper>
      )}

      {showBuyerNamesPopup && (
        <ModalWrapper onClose={() => setShowBuyerNamesPopup(false)}>
          <BuyerNamesManagementPage />
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
