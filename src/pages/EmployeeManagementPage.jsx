import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaEye, FaFileExport, FaLock, FaPencilAlt, FaPlus, FaShieldAlt, FaTrash } from "react-icons/fa";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

const CASH_BOOK_ALL_PERMISSIONS = [
  "cash.view",
  "cash.create",
  "cash.edit",
  "cash.delete",
  "cash.mainBook.view",
  "cash.mainBook.create",
  "cash.mainBook.edit",
  "cash.mainBook.delete",
  "cash.partiesBook.view",
  "cash.partiesBook.create",
  "cash.partiesBook.edit",
  "cash.partiesBook.delete",
  "cash.employeeBook.view",
  "cash.employeeBook.create",
  "cash.employeeBook.edit",
  "cash.employeeBook.delete",
];

const CASH_BOOK_LEGACY_PERMISSIONS = [
  "cash.view",
  "cash.create",
  "cash.edit",
  "cash.delete",
];

const CASH_BOOK_DETAILED_PERMISSIONS = CASH_BOOK_ALL_PERMISSIONS.filter(
  (permission) => !CASH_BOOK_LEGACY_PERMISSIONS.includes(permission)
);

const PERMISSION_GROUPS = [
  {
    key: "operations",
    title: "Operations",
    items: [
      
      { key: "inward_access", label: "Inward", permissions: ["inward.view", "inward.create", "inward.edit", "inward.delete"] },
      { key: "outward_access", label: "Outward", permissions: ["outward.view", "outward.create", "outward.edit", "outward.delete"] },
      { key: "adjustment_access", label: "Outward Adjustment", permissions: ["adjustment.manage"] },
      { key: "settlement_access", label: "Settlement", permissions: ["settlement.view", "settlement.companyRate"] },
      { key: "expense_access", label: "Expense Entry", permissions: ["expense.entry", "expense.create", "expense.edit", "expense.delete"] },
      { key: "expense_posted_inward_access", label: "Expense to Inward Posted", permissions: ["expense.postedInward"] },
      { key: "expense_palti_access", label: "Palti Lorry", permissions: ["expense.palti"] },
      { key: "expense_self_loading_access", label: "Self Loading", permissions: ["expense.selfLoading"] },
      { key: "expense_local_sale_access", label: "Local Sale", permissions: ["expense.localSale"] },
      { key: "expense_pending_access", label: "Expenses Pending", permissions: ["expense.pending"] },
      { key: "cash_access", label: "Cash Book", permissions: CASH_BOOK_ALL_PERMISSIONS, allAccess: true },
      { key: "cash_entry_access", label: "New Cash Entry", permissions: ["cash.view", "cash.create"], grantTogether: true },
      { key: "cash_main_report_access", label: "Main Cash Book Report", permissions: ["cash.mainBook.view"] },
      { key: "cash_parties_report_access", label: "Parties Cash Book Report", permissions: ["cash.partiesBook.view"] },
      { key: "cash_employee_report_access", label: "Employee Cash Book Report", permissions: ["cash.employeeBook.view"] },
      { key: "transport_access", label: "Transport", permissions: ["transport.manage"] },
    ],
  },
  {
    key: "warehouse",
    title: "Warehouse Module",
    items: [
      { key: "warehouse_setup", label: "Warehouse Setup", permissions: ["warehouses.manage"] },
      { key: "warehouse_farmers", label: "Farmers", permissions: ["farmers.view", "farmers.create", "farmers.edit", "farmers.delete"] },
      { key: "warehouse_purchase", label: "Purchase Voucher", permissions: ["warehouse.trading.purchase.view", "warehouse.trading.purchase.manage"] },
      { key: "warehouse_sale", label: "Sale Voucher", permissions: ["warehouse.trading.sale.view", "warehouse.trading.sale.manage"] },
      { key: "warehouse_payment", label: "Payment Voucher", permissions: ["warehouse.trading.payment.view", "warehouse.trading.payment.manage"] },
      { key: "warehouse_receipt", label: "Receipt Voucher", permissions: ["warehouse.trading.receipt.view", "warehouse.trading.receipt.manage"] },
      { key: "warehouse_journal", label: "Journal Voucher", permissions: ["warehouse.trading.journal.view", "warehouse.trading.journal.manage"] },
      { key: "warehouse_report_sale", label: "Sales Report", permissions: ["warehouse.trading.report.sale"] },
      { key: "warehouse_report_purchase", label: "Purchase Report", permissions: ["warehouse.trading.report.purchase"] },
      { key: "warehouse_report_profit_loss", label: "Profit/Loss Report", permissions: ["warehouse.trading.report.profitLoss"] },
    ],
  },
  {
    key: "reports",
    title: "Reports",
    items: [
      { key: "report_inward", label: "Inward Report", permissions: ["report.inward"] },
      { key: "report_erp", label: "ERP Report", permissions: ["report.erp"] },
      { key: "report_party_ledger", label: "Party Ledger", permissions: ["report.partyLedger"] },
      { key: "report_party_stock", label: "Party Stock", permissions: ["report.partyStock"] },
      { key: "report_rent_ledger", label: "Warehouse Rent Ledger", permissions: ["report.warehouseRentLedger"] },
      { key: "report_rent_month_end", label: "Month End Rent", permissions: ["report.warehouseRentMonthEnd"] },
      { key: "report_settlement", label: "Settlement Report", permissions: ["report.outwardSettlement"] },
      { key: "report_expense", label: "Expense Report", permissions: ["report.expense"] },
      { key: "report_palti_adjustment", label: "Palti Lorry Adjustment", permissions: ["report.paltiLorryAdjustment"] },
      { key: "report_cash", label: "Cash Report", permissions: ["report.cash"] },
    ],
  },
  {
    key: "masters",
    title: "Masters and Admin",
    items: [
      { key: "employees_manage", label: "Employees", permissions: ["employees.view"] },
      { key: "employees_non_admin_edit", label: "Employees Edit (Non-admin)", permissions: ["employees.edit.non_admin"] },
      { key: "locations_manage", label: "Location", permissions: ["locations.manage"] },
      { key: "warehouses_manage", label: "Warehouse", permissions: ["warehouses.manage"] },
      { key: "companies_manage", label: "Companies", permissions: ["companies.manage"] },
      { key: "accounts_manage", label: "Company Accounts", permissions: ["companyAccounts.manage"] },
      { key: "products_manage", label: "Products", permissions: ["products.manage"] },
      { key: "dashboard_view", label: "Dashboard", permissions: ["dashboard.view"] },
    ],
  },
];

const ALL_PERMISSION_ITEMS = PERMISSION_GROUPS.flatMap((group) => group.items);
const ACTIONS = ["view", "create", "edit", "delete"];
const ACTION_META = {
  access: { icon: FaShieldAlt, label: "Access" },
  all: { icon: FaShieldAlt, label: "All" },
  view: { icon: FaEye, label: "View" },
  create: { icon: FaPlus, label: "Add" },
  edit: { icon: FaPencilAlt, label: "Edit" },
  delete: { icon: FaTrash, label: "Delete" },
  manage: { icon: FaShieldAlt, label: "Manage" },
  export: { icon: FaFileExport, label: "Export" },
};

const actionKindFromOption = (option = {}) => {
  const key = String(option.id || "").split(":").pop();
  const label = String(option.label || "").toLowerCase();
  if (label.includes("all")) return "all";
  if (label.includes("create") || label.includes("add")) return "create";
  if (label.includes("edit") || label.includes("manage")) return label.includes("manage") ? "manage" : "edit";
  if (label.includes("delete")) return "delete";
  if (label.includes("export")) return "export";
  if (label.includes("view")) return "view";
  return ACTION_META[key] ? key : "access";
};

const getActionOptions = (groupKey, item) => {
  if (item.allAccess) {
    return [
      {
        id: `${item.key}:all`,
        label: "All Access",
        permissions: item.permissions || [],
        checkGroups: [CASH_BOOK_LEGACY_PERMISSIONS, CASH_BOOK_DETAILED_PERMISSIONS],
      },
    ];
  }

  if (item.grantTogether) {
    return [{ id: `${item.key}:access`, label: "Access", permissions: item.permissions || [] }];
  }

  if (groupKey === "operations") {
    const options = ACTIONS.map((action) => {
      const direct = item.permissions.find((permission) => permission.endsWith(`.${action}`));
      return { id: `${item.key}:${action}`, label: action[0].toUpperCase() + action.slice(1), permission: direct || item.permissions[0] || null };
    }).filter((option, index, arr) => option.permission && arr.findIndex((x) => x.permission === option.permission) === index);

    if (item.permissions.length > 1) {
      return options;
    }
    return [{ id: `${item.key}:access`, label: "Access", permission: item.permissions[0] || null }];
  }
  if (groupKey === "warehouse") {
    if (
      [
        "warehouse_purchase",
        "warehouse_sale",
        "warehouse_payment",
        "warehouse_receipt",
        "warehouse_journal",
      ].includes(item.key)
    ) {
      return [
        { id: `${item.key}:view`, label: "View", permission: item.permissions[0] || null },
        { id: `${item.key}:manage`, label: "Create/Edit", permission: item.permissions[1] || null },
      ];
    }
    if (item.key === "warehouse_farmers") {
      return ACTIONS.map((action) => {
        const direct = item.permissions.find((permission) => permission.endsWith(`.${action}`));
        return { id: `${item.key}:${action}`, label: action[0].toUpperCase() + action.slice(1), permission: direct || item.permissions[0] || null };
      }).filter((option, index, arr) => option.permission && arr.findIndex((x) => x.permission === option.permission) === index);
    }
    return [{ id: `${item.key}:access`, label: "Access", permission: item.permissions[0] || null }];
  }
  if (groupKey === "masters") {
    if (item.key === "employees_non_admin_edit") {
      return [{ id: `${item.key}:edit`, label: "Edit", permission: item.permissions[0] || null }];
    }
    const basePermission = item.permissions[0] || null;
    const baseName = basePermission ? basePermission.replace(/\.manage$|\.view$/g, "") : item.key;
    return ACTIONS.map((action) => ({
      id: `${item.key}:${action}`,
      label: action[0].toUpperCase() + action.slice(1),
      permissions: [`${baseName}.${action}`, basePermission].filter(Boolean),
    }));
  }
  if (groupKey === "reports") {
    const basePermission = item.permissions[0] || null;
    return [
      ...ACTIONS.map((action) => ({
        id: `${item.key}:${action}`,
        label: action[0].toUpperCase() + action.slice(1),
        permissions: [`${basePermission}.${action}`, basePermission].filter(Boolean),
      })),
      { id: `${item.key}:export`, label: "Export", permissions: [`${basePermission}.export`, basePermission].filter(Boolean) },
    ];
  }
  return [{ id: item.key, label: item.label, permission: item.permissions[0] || null }];
};

const ALL_ACTION_OPTIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => getActionOptions(group.key, item))
);

const optionPermissions = (option) =>
  Array.isArray(option.permissions)
    ? option.permissions
    : option.permission
    ? [option.permission]
    : [];

const isOptionEnabledByPermissions = (option, permissionSet) => {
  if (Array.isArray(option.checkGroups)) {
    return option.checkGroups.some(
      (group) => Array.isArray(group) && group.length > 0 && group.every((permission) => permissionSet.has(permission))
    );
  }

  return optionPermissions(option).some((permission) => permissionSet.has(permission));
};

const flattenPermissionsFromToggles = (toggles) =>
  Array.from(new Set(ALL_ACTION_OPTIONS.flatMap((option) => (toggles[option.id] ? optionPermissions(option) : []))));

const countEnabledToggles = (toggles = {}) =>
  Object.values(toggles || {}).filter(Boolean).length;

const formatSerial = (index) =>
  String(index + 1).padStart(2, "0");

const togglesFromPermissions = (permissions = []) => {
  const permissionSet = new Set(permissions || []);
  return ALL_ACTION_OPTIONS.reduce((acc, option) => {
    acc[option.id] = isOptionEnabledByPermissions(option, permissionSet);
    return acc;
  }, {});
};

const summarizeRoleAccess = (role) => {
  if (role?.is_admin || (role?.permissions || []).includes("all")) {
    return "Full access";
  }

  const toggles = togglesFromPermissions(role?.permissions || []);
  const count = countEnabledToggles(toggles);
  return count ? `${count} access selected` : "No access";
};

const createDefaultFormData = () => ({
  name: "",
  mobile: "",
  address: "",
  username: "",
  password: "",
  location_id: "",
  location_ids: [],
  all_location_access: false,
  role: "",
  permissions: ["dashboard.view"],
  opening_balance: "0",
  opening_balance_type: "dr",
  assigned_warehouse_ids: [],
  all_warehouse_access: false,
});

const createRoleForm = () => ({
  name: "",
  toggles: togglesFromPermissions(["dashboard.view"]),
  is_admin: false,
});

// Normalize data from backend - convert _id to id if needed
const normalizeData = (data) => {
  if (!data) return null;
  const id = data.id ?? data._id;
  return {
    ...data,
    id,
  };
};

const employeeRecordId = (employee) =>
  employee?.id ?? employee?._id ?? "";

const employeeMobileValue = (employee) =>
  String(employee?.mobile ?? employee?.mobile_no ?? employee?.phone ?? "").trim();

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

const normalizeIdArray = (input) => {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => normalizeId(item))
        .filter(Boolean)
    )
  );
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeData);
};

const collectEmployeeWarehouseIds = (employee, warehouses) => {
  const employeeId = String(employee?.id || employee?._id || "");
  const fromEmployee = normalizeIdArray(employee?.assigned_warehouse_ids);

  const fromWarehouseSide = normalizeIdArray(
    (warehouses || [])
      .filter((item) => {
        const primary = normalizeId(item?.employee_id);
        const many = normalizeIdArray(item?.employee_ids);
        return primary === employeeId || many.includes(employeeId);
      })
      .map((item) => normalizeId(item?._id || item?.id))
  );

  return Array.from(new Set([...fromEmployee, ...fromWarehouseSide]));
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableRequestError = (err) => {
  const status = err?.response?.status;
  return !status || [502, 503, 504].includes(status);
};

const requestWithRetry = async (requestFn, retries = 2, delayMs = 400) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !isRetryableRequestError(err)) {
        throw err;
      }
      await wait(delayMs * (attempt + 1));
    }
  }

  throw lastError;
};

export default function EmployeeManagementPage() {
  const { user: currentUser } = loadSession();
  const isAdminUser = hasPermission(currentUser, "all");
  const canCreateEmployee = isAdminUser;
  const canEditEmployee =
    isAdminUser ||
    hasPermission(currentUser, "employees.edit.non_admin") ||
    hasPermission(currentUser, "employees.edit");
  const canDeleteEmployee = isAdminUser;
  const canManageRoles = isAdminUser;

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [employeeToggles, setEmployeeToggles] = useState(togglesFromPermissions(["dashboard.view"]));
  const [roleForm, setRoleForm] = useState(createRoleForm());
  const [editId, setEditId] = useState(null);
  const [editRoleId, setEditRoleId] = useState(null);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchEmployees = async () => {
    const res = await requestWithRetry(() => axios.get("/api/employees"));

    setEmployees(
      normalizeArray(res.data || [])
    );
  };

  const fetchRoles = async () => {
    const res = await requestWithRetry(() => axios.get("/api/roles"));

    setRoles(
      normalizeArray(res.data || [])
    );
  };

  const fetchMeta = async () => {
    const [locationRes, warehouseRes] =
      await requestWithRetry(() =>
        Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/warehouses")
        ])
      );

    setLocations(
      normalizeArray(locationRes.data || [])
    );

    setWarehouses(
      normalizeArray(warehouseRes.data || [])
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const results = await Promise.allSettled([
        fetchEmployees(),
        fetchRoles(),
        fetchMeta(),
      ]);

      if (cancelled) return;

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        console.error("Employee management data load failed:", failed.map((item) => item.reason));
        alert("Some master data could not be loaded. Please retry in a moment.");
      }
    };

    loadData().catch((err) => {
      if (!cancelled) {
        console.error(err);
        alert("Failed to load users and security data");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const warehouseOptions = useMemo(
  () =>
    warehouses.map((item) => ({
      value: String(item._id || item.id),
      label: item.location_name
        ? `${item.name} (${item.location_name})`
        : item.name,
    })),
  [warehouses]
);

  const roleOptions = useMemo(() => roles.map((role) => ({ value: String(role.id), label: role.name })), [roles]);
  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: String(item._id || item.id),
        label: item.name,
      })),
    [locations]
  );
  const allLocationIds = useMemo(() => locationOptions.map((item) => String(item.value)), [locationOptions]);
  const allWarehouseIds = useMemo(() => warehouseOptions.map((item) => String(item.value)), [warehouseOptions]);
  const selectedLocationIds = useMemo(() => normalizeIdArray(formData.location_ids), [formData.location_ids]);
  const selectedWarehouseIds = useMemo(() => normalizeIdArray(formData.assigned_warehouse_ids), [formData.assigned_warehouse_ids]);
  const allLocationsSelected =
    !!formData.all_location_access ||
    (allLocationIds.length > 0 && allLocationIds.every((id) => selectedLocationIds.includes(id)));
  const allWarehousesSelected =
    !!formData.all_warehouse_access ||
    (allWarehouseIds.length > 0 && allWarehouseIds.every((id) => selectedWarehouseIds.includes(id)));

  const permissionSummary = useMemo(() => {
    const selected = flattenPermissionsFromToggles(employeeToggles);
    return selected.length ? `${countEnabledToggles(employeeToggles)} access selected` : "No access selected";
  }, [employeeToggles]);

  const mergeSelectedOptions = (options, selectedIds, fallbackLabel) => {
    const existing = new Set((options || []).map((item) => String(item.value)));
    const fallbackOptions = normalizeIdArray(selectedIds)
      .filter((id) => !existing.has(String(id)))
      .map((id) => ({ value: String(id), label: `${fallbackLabel} ${id}` }));
    return [...fallbackOptions, ...(options || [])];
  };

  const resetEmployeeForm = () => {
    setFormData(createDefaultFormData());
    setEmployeeToggles(togglesFromPermissions(["dashboard.view"]));
    setEditId(null);
    setShowPassword(false);
    setShowEmployeeForm(false);
  };

  const resetRoleForm = () => {
    setRoleForm(createRoleForm());
    setEditRoleId(null);
    setShowRoleEditor(false);
  };

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;
    if (name === "role") {
      const selectedRole = roles.find((item) => String(item.id) === String(value));
      if (selectedRole) {
        const selectedPermissions = selectedRole.is_admin ? ["all"] : selectedRole.permissions || [];
        setFormData((prev) => ({ ...prev, role: selectedRole.name }));
        setEmployeeToggles(togglesFromPermissions(selectedPermissions.includes("all") ? ALL_PERMISSION_ITEMS.flatMap((item) => item.permissions) : selectedPermissions));
      } else {
        setFormData((prev) => ({ ...prev, role: "" }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeToggle = (key) => {
    setEmployeeToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRoleToggle = (key) => {
    setRoleForm((prev) => ({ ...prev, toggles: { ...prev.toggles, [key]: !prev.toggles[key] } }));
  };

  const allToggleMap = () =>
    ALL_ACTION_OPTIONS.reduce((acc, option) => {
      acc[option.id] = true;
      return acc;
    }, {});

  const viewOnlyToggleMap = () =>
    ALL_ACTION_OPTIONS.reduce((acc, option) => {
      acc[option.id] = ["view", "access"].includes(actionKindFromOption(option));
      return acc;
    }, {});

  const clearToggleMap = () =>
    ALL_ACTION_OPTIONS.reduce((acc, option) => {
      acc[option.id] = false;
      return acc;
    }, {});

  const setAllLocations = () => {
    setFormData((prev) => ({
      ...prev,
      location_ids: allLocationIds,
      location_id: allLocationIds[0] || "",
      all_location_access: true,
    }));
  };

  const clearLocations = () => {
    setFormData((prev) => ({
      ...prev,
      location_ids: [],
      location_id: "",
      all_location_access: false,
    }));
  };

  const setAllWarehouses = () => {
    setFormData((prev) => ({
      ...prev,
      assigned_warehouse_ids: allWarehouseIds,
      all_warehouse_access: true,
    }));
  };

  const clearWarehouses = () => {
    setFormData((prev) => ({
      ...prev,
      assigned_warehouse_ids: [],
      all_warehouse_access: false,
    }));
  };

 const handleSubmitEmployee = async (e) => {
  e.preventDefault();

  if (isSubmittingEmployee) return;

  const safeLocationIds = Array.isArray(formData.location_ids)
    ? normalizeIdArray(formData.location_ids)
    : [];

  // Validate location
  if (safeLocationIds.length === 0) {
    alert("Please select at least one location");
    return;
  }

  const permissions =
    flattenPermissionsFromToggles(employeeToggles);

  const payload = {
    ...formData,

    mobile: String(formData.mobile ?? "").trim(),

    location_id: safeLocationIds[0] || "",
    location_ids: safeLocationIds,

    role: formData.role || "Custom Role",

    permissions,

    // Keep ObjectId strings
    assigned_warehouse_ids:
      normalizeIdArray(formData.assigned_warehouse_ids),
  };

  console.log("[employee.submit] payload:", payload);

  // Required field validation
  if (
    !payload.name ||
    !payload.username ||
    (!editId && !payload.password)
  ) {
    alert("Name, username and password are required");
    return;
  }

  // Duplicate username check
  const isDuplicateUsername = employees.some(
    (emp) =>
      emp.username === payload.username &&
      (!editId ||
        String(emp.id || emp._id) !== String(editId))
  );

  if (isDuplicateUsername) {
    alert(
      "Username already exists. Please use a different username."
    );
    return;
  }

  setIsSubmittingEmployee(true);

  try {
    if (editId) {
      await axios.put(
        `/api/employees/${editId}`,
        payload
      );
    } else {
      await axios.post(
        "/api/employees",
        payload
      );
    }

    await Promise.all([
      fetchEmployees(),
      fetchMeta(),
    ]);

    resetEmployeeForm();

  } catch (err) {
    console.error(err);

    alert(
      err.response?.data?.error ||
      "Failed to save employee"
    );

  } finally {
    setIsSubmittingEmployee(false);
  }
};

  const handleSubmitRole = async (e) => {
    e.preventDefault();
    if (isSubmittingRole) return;
    
    const permissions = roleForm.is_admin ? ["all"] : flattenPermissionsFromToggles(roleForm.toggles);
    const payload = { name: roleForm.name, permissions, is_admin: roleForm.is_admin };

    if (!payload.name) {
      alert("Role name is required");
      return;
    }

    setIsSubmittingRole(true);
    try {
      if (editRoleId) {
        await axios.put(`/api/roles/${editRoleId}`, payload);
      } else {
        await axios.post("/api/roles", payload);
      }
      await fetchRoles();
      resetRoleForm();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to save role");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleEditEmployee = async (employee) => {
    const recordId = employeeRecordId(employee);
    if (!employee || recordId === "" || recordId == null) {
      alert("Invalid employee data. Cannot edit.");
      console.error("Edit attempted with invalid employee:", employee);
      return;
    }

    let detail = employee;
    try {
      const detailRes = await axios.get(`/api/employees/${recordId}`);
      detail = normalizeData(detailRes.data) || employee;
    } catch (err) {
      console.error("Employee detail load failed:", err);
      alert("Employee details refresh korte problem hoyeche, list data diye edit form khola holo.");
    }

    const employeeIsAdmin =
      String(detail?.role || "").toLowerCase() === "admin" ||
      (Array.isArray(detail?.permissions) && detail.permissions.includes("all"));
    if (!isAdminUser && employeeIsAdmin) {
      alert("Only admin can edit admin account");
      return;
    }

    const assignedWarehouseIds = detail.all_warehouse_access && allWarehouseIds.length
      ? allWarehouseIds
      : collectEmployeeWarehouseIds(detail, warehouses);
    const safeEditLocationIds = normalizeIdArray(detail.location_ids);
    const fallbackLocationId = normalizeId(detail.location_id);
    const finalEditLocationIds = detail.all_location_access && allLocationIds.length
      ? allLocationIds
      : safeEditLocationIds.length
      ? safeEditLocationIds
      : fallbackLocationId
      ? [fallbackLocationId]
      : [];

    setFormData({
      name: detail.name || "",
      mobile: employeeMobileValue(detail),
      address: detail.address || "",
      username: detail.username || "",
      password: "",
      location_id: fallbackLocationId,
      location_ids: finalEditLocationIds,
      all_location_access: !!detail.all_location_access,
      role: detail.role || "",
      permissions: detail.permissions || [],
      opening_balance: String(detail.opening_balance || 0),
      opening_balance_type: detail.opening_balance_type || "dr",
      assigned_warehouse_ids: assignedWarehouseIds,
      all_warehouse_access: !!detail.all_warehouse_access,
    });
    setEmployeeToggles(togglesFromPermissions(detail.permissions || []));
    setEditId(String(recordId));
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (id) => {
    // Validate ID before attempting delete
    if (!id || id === undefined || id === null || id === "") {
      alert("Invalid employee ID. Cannot delete.");
      console.error("Delete attempted with invalid ID:", id);
      return;
    }
    
    if (!window.confirm("Delete this employee?")) return;
    try {
      await axios.delete(`/api/employees/${id}`);
      await fetchEmployees();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.error || "Failed to delete employee");
    }
  };

  const handleViewEmployee = (employee) => {
    const assignedWarehouseIds = collectEmployeeWarehouseIds(employee, warehouses);
    const employeeLocationIds = Array.isArray(employee.location_ids) && employee.location_ids.length
      ? normalizeIdArray(employee.location_ids)
      : employee.location_id
      ? [normalizeId(employee.location_id)]
      : [];
    const assignedNames = assignedWarehouseIds
      .map((warehouseId) => warehouses.find((item) => String(item._id || item.id) === String(warehouseId))?.name)
      .filter(Boolean)
      .join(", ");
    const locationNames = employeeLocationIds
      .map((id) => locations.find((item) => String(item._id || item.id) === String(id))?.name)
      .filter(Boolean)
      .join(", ");
    alert(
      [
        `Name: ${employee.name || "-"}`,
        `Mobile: ${employeeMobileValue(employee) || "-"}`,
        `Username: ${employee.username || "-"}`,
        `Role: ${employee.role || "Custom Role"}`,
        `Location: ${employee.all_location_access ? "All Locations" : locationNames || "-"}`,
        `Warehouse: ${employee.all_warehouse_access ? "All Warehouses" : assignedNames || "-"}`,
        `Security: ${summarizeRoleAccess({ permissions: employee.permissions || [], is_admin: false })}`,
      ].join("\n")
    );
  };

  const handleEditRole = (role) => {
    // Validate role object and ID
    if (!role || !role.id) {
      alert("Invalid role data. Cannot edit.");
      console.error("Edit attempted with invalid role:", role);
      return;
    }

    setRoleForm({
      name: role.name || "",
      is_admin: !!role.is_admin,
      toggles: togglesFromPermissions(role.permissions || []),
    });
    setEditRoleId(role.id);
    setShowRoleEditor(true);
  };

  const handleDeleteRole = async (id) => {
    // Validate ID before attempting delete
    if (!id || id === undefined || id === null || id === "") {
      alert("Invalid role ID. Cannot delete.");
      console.error("Delete attempted with invalid ID:", id);
      return;
    }
    
    if (!window.confirm("Delete this role?")) return;
    try {
      await axios.delete(`/api/roles/${id}`);
      await fetchRoles();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.error || "Failed to delete role");
    }
  };

  return (
    <div style={pageStyle}>
      <div style={heroCard}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Users and Security</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Create employee users, assign roles, and keep access locked by permission.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canCreateEmployee ? <button type="button" onClick={() => setShowEmployeeForm(true)} style={primaryButton}>New Employee</button> : null}
          {canManageRoles ? <button type="button" onClick={() => setShowRoleManager(true)} style={secondaryButton}>Role Security</button> : null}
        </div>
      </div>

      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={thStyle}>S.L</th>
              <th style={thStyle}>Employee ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Warehouse</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => {
              const assignedWarehouseIds = collectEmployeeWarehouseIds(employee, warehouses);
              const hasAllWarehouses =
                !!employee.all_warehouse_access ||
                warehouseOptions.length > 0 &&
                allWarehouseIds.every((id) => assignedWarehouseIds.map(String).includes(id));
              const assignedNames = assignedWarehouseIds
                .map((warehouseId) =>
                  warehouses.find(
                    (item) =>
                      String(item._id || item.id) === String(warehouseId)
                  )?.name
                )
                .filter(Boolean)
                .join(", ");
              const employeeLocationIds = Array.isArray(employee.location_ids) && employee.location_ids.length
                ? normalizeIdArray(employee.location_ids)
                : employee.location_id
                ? [normalizeId(employee.location_id)]
                : [];
              const hasAllLocations =
                !!employee.all_location_access ||
                locationOptions.length > 0 &&
                allLocationIds.every((id) => employeeLocationIds.map(String).includes(id));
              const locationNames = employeeLocationIds
                .map((id) =>
                  locations.find(
                    (item) => String(item._id || item.id) === String(id)
                  )?.name
                )
                .filter(Boolean)
                .join(", ");
              const employeeIsAdmin =
                String(employee?.role || "").toLowerCase() === "admin" ||
                (Array.isArray(employee?.permissions) && employee.permissions.includes("all"));
              const canEditThisEmployee = canEditEmployee && (isAdminUser || !employeeIsAdmin);
              return (
                <tr key={String(employeeRecordId(employee))} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={tdStyle}><span style={serialBadge}>{formatSerial(index)}</span></td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>
                      {(employee.employee_id && String(employee.employee_id).trim()) || `EMP${formatSerial(index)}`}
                    </div>
                  </td>
                  <td style={tdStyle}>{employee.name}</td>
                  <td style={tdStyle}>{employeeMobileValue(employee) || "-"}</td>
                  <td style={tdStyle}>{employee.username}</td>
                  <td style={tdStyle}><span style={roleBadge(employeeIsAdmin)}>{employee.role || "Custom Role"}</span></td>
                  <td style={tdStyle}>
                    {hasAllLocations ? "All Locations" : locationNames || "-"}
                  </td>
                  <td style={tdStyle}>{hasAllWarehouses ? "All Warehouses" : assignedNames || "-"}</td>
                  <td style={tdStyle}>
                    <button type="button" onClick={() => handleViewEmployee(employee)} style={iconButton("#0f766e")} title="View">
                      <FaEye />
                    </button>
                    {canEditThisEmployee ? (
                      <button type="button" onClick={() => handleEditEmployee(employee)} style={iconButton("#2563eb")} title="Edit">
                        <FaPencilAlt />
                      </button>
                    ) : null}
                    {canDeleteEmployee && employeeRecordId(employee) ? (
                      <button type="button" onClick={() => handleDeleteEmployee(String(employeeRecordId(employee)))} style={iconButton("#dc2626")} title="Delete">
                        <FaTrash />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showEmployeeForm ? (
        <Modal onClose={resetEmployeeForm} title={editId ? "Edit User" : "Create User"}>
          <form onSubmit={handleSubmitEmployee}>
            <div style={formGrid}>
              <Field label="Name"><input name="name" value={formData.name} onChange={handleEmployeeChange} style={inputStyle} /></Field>
              <Field label="Mobile"><input name="mobile" value={formData.mobile} onChange={handleEmployeeChange} style={inputStyle} /></Field>
              <Field label="Username"><input name="username" value={formData.username} onChange={handleEmployeeChange} style={inputStyle} /></Field>
              <Field label="Password">
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleEmployeeChange}
                    placeholder={editId ? "Leave blank to keep current password" : "Password"}
                    style={{ ...inputStyle, paddingLeft: editId ? 34 : inputStyle.padding, paddingRight: 42 }}
                  />
                  {editId ? <FaLock style={{ position: "absolute", left: 12, top: 12, color: "#64748b", fontSize: 13 }} /> : null}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 7,
                      width: 30,
                      height: 30,
                      border: "none",
                      borderRadius: 8,
                      background: "#e2e8f0",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <FaEye />
                  </button>
                </div>
                {editId ? <div style={{ marginTop: 5, fontSize: 11, color: "#64748b", fontWeight: 700 }}>Current password is preserved unless you type a new one.</div> : null}
              </Field>
              <Field label="Role">
                <select
                  name="role"
                  value={roleOptions.find((item) => item.label === formData.role)?.value || ""}
                  onChange={handleEmployeeChange}
                  style={inputStyle}
                  disabled={!isAdminUser}
                >
                  <option value="">Custom</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={accessToolbar}>
                  <button type="button" onClick={setAllLocations} style={miniGreen} disabled={!allLocationIds.length}>
                    All Locations
                  </button>
                  <button type="button" onClick={clearLocations} style={miniSlate}>
                    Clear Locations
                  </button>
                  <span style={accessHint}>{allLocationsSelected ? "All location access selected" : `${selectedLocationIds.length} location selected`}</span>
                </div>
                <MultiSelectDropdown
                  label="Location"
                  options={mergeSelectedOptions(locationOptions, formData.location_ids, "Saved Location")}
                  value={formData.location_ids}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      location_ids: next,
                      location_id: next[0] || "",
                      all_location_access:
                        allLocationIds.length > 0 && allLocationIds.every((id) => next.map(String).includes(id)),
                    }))
                  }
                  placeholder="Select Location"
                />
              </div>
              <Field label="Opening Balance">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10 }}>
                  <input name="opening_balance" value={formData.opening_balance} onChange={handleEmployeeChange} style={inputStyle} />
                  <select name="opening_balance_type" value={formData.opening_balance_type} onChange={handleEmployeeChange} style={inputStyle}>
                    <option value="dr">Dr</option>
                    <option value="cr">Cr</option>
                  </select>
                </div>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address"><textarea name="address" value={formData.address} onChange={handleEmployeeChange} rows={2} style={{ ...inputStyle, minHeight: 80 }} /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={accessToolbar}>
                  <button type="button" onClick={setAllWarehouses} style={miniGreen} disabled={!allWarehouseIds.length}>
                    All Warehouses
                  </button>
                  <button type="button" onClick={clearWarehouses} style={miniSlate}>
                    Clear Warehouses
                  </button>
                  <span style={accessHint}>{allWarehousesSelected ? "All warehouse access selected" : `${selectedWarehouseIds.length} warehouse selected`}</span>
                </div>
                <MultiSelectDropdown
                  label="Assigned Warehouses"
                  options={mergeSelectedOptions(warehouseOptions, formData.assigned_warehouse_ids, "Saved Warehouse")}
                  value={formData.assigned_warehouse_ids}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      assigned_warehouse_ids: next,
                      all_warehouse_access:
                        allWarehouseIds.length > 0 && allWarehouseIds.every((id) => next.map(String).includes(id)),
                    }))
                  }
                  placeholder="Select Warehouses"
                />
              </div>
            </div>

            <div style={securityCard}>
              <div style={sectionHeaderRow}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Access Control</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Tick only the modules this employee can use.</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setEmployeeToggles(allToggleMap())} style={miniGreen} disabled={!isAdminUser}>Full Access</button>
                  <button type="button" onClick={() => setEmployeeToggles(viewOnlyToggleMap())} style={miniSlate} disabled={!isAdminUser}>View Only</button>
                  <button type="button" onClick={() => setEmployeeToggles(clearToggleMap())} style={miniRedSoft} disabled={!isAdminUser}>Clear</button>
                  <span style={accessCountBadge}>{permissionSummary}</span>
                </div>
              </div>
              <div style={groupGrid}>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.key} style={groupCard}>
                    <div style={groupTitle}>{group.title}</div>
                    {group.items.map((item) => (
                      <div key={item.key} style={checkBlock}>
                        <div style={checkLabel}>{item.label}</div>
                        <div style={actionRowWrap}>
                              {getActionOptions(group.key, item).map((option) => (
                                <PermissionToggle
                                  key={option.id}
                                  option={option}
                                  checked={!!employeeToggles[option.id]}
                                  onChange={() => handleEmployeeToggle(option.id)}
                                  disabled={!isAdminUser}
                                />
                              ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={actionRow}>
              <button type="submit" disabled={isSubmittingEmployee} style={{...primaryButton, opacity: isSubmittingEmployee ? 0.6 : 1, cursor: isSubmittingEmployee ? 'not-allowed' : 'pointer'}}>{isSubmittingEmployee ? 'Saving...' : 'Save User'}</button>
              <button type="button" onClick={resetEmployeeForm} disabled={isSubmittingEmployee} style={{...dangerButton, opacity: isSubmittingEmployee ? 0.6 : 1, cursor: isSubmittingEmployee ? 'not-allowed' : 'pointer'}}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showRoleManager && canManageRoles ? (
        <Modal onClose={() => { setShowRoleManager(false); resetRoleForm(); }} title="Role Security">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#64748b" }}>Create clean roles once, then assign that role to employees.</div>
            <button type="button" onClick={() => setShowRoleEditor(true)} style={primaryButton}>New Role</button>
          </div>
          <div style={tableCardStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Security</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td style={tdStyle}><span style={roleBadge(!!role.is_admin || (role.permissions || []).includes("all"))}>{role.name}</span></td>
                    <td style={tdStyle}>{role.is_admin ? "Administrator" : "Limited Role"}</td>
                    <td style={tdStyle}>{summarizeRoleAccess(role)}</td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => handleEditRole(role)} style={iconButton("#2563eb")} title="Edit Role"><FaPencilAlt /></button>
                      {role.id ? <button type="button" onClick={() => handleDeleteRole(role.id)} style={iconButton("#dc2626")} title="Delete Role"><FaTrash /></button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showRoleEditor ? (
            <div style={{ ...securityCard, marginTop: 16 }}>
              <form onSubmit={handleSubmitRole}>
                <div style={formGrid}>
                  <Field label="Role Name"><input value={roleForm.name} onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))} style={inputStyle} /></Field>
                  <label style={{ ...checkRow, alignSelf: "end", paddingBottom: 10 }}>
                    <input type="checkbox" checked={roleForm.is_admin} onChange={(e) => setRoleForm((prev) => ({ ...prev, is_admin: e.target.checked }))} />
                    <span>Administrator Role</span>
                  </label>
                </div>
                {!roleForm.is_admin ? (
                  <>
                  <div style={{ ...accessToolbar, marginBottom: 12 }}>
                    <button type="button" onClick={() => setRoleForm((prev) => ({ ...prev, toggles: allToggleMap() }))} style={miniGreen}>Full Access</button>
                    <button type="button" onClick={() => setRoleForm((prev) => ({ ...prev, toggles: viewOnlyToggleMap() }))} style={miniSlate}>View Only</button>
                    <button type="button" onClick={() => setRoleForm((prev) => ({ ...prev, toggles: clearToggleMap() }))} style={miniRedSoft}>Clear</button>
                  </div>
                  <div style={groupGrid}>
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.key} style={groupCard}>
                        <div style={groupTitle}>{group.title}</div>
                        {group.items.map((item) => (
                          <div key={item.key} style={checkBlock}>
                            <div style={checkLabel}>{item.label}</div>
                            <div style={actionRowWrap}>
                              {getActionOptions(group.key, item).map((option) => (
                                <PermissionToggle
                                  key={option.id}
                                  option={option}
                                  checked={!!roleForm.toggles[option.id]}
                                  onChange={() => handleRoleToggle(option.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  </>
                ) : null}
                <div style={actionRow}>
                  <button type="submit" disabled={isSubmittingRole} style={{...primaryButton, opacity: isSubmittingRole ? 0.6 : 1, cursor: isSubmittingRole ? 'not-allowed' : 'pointer'}}>{isSubmittingRole ? 'Saving...' : 'Save Role'}</button>
                  <button type="button" onClick={resetRoleForm} disabled={isSubmittingRole} style={{...dangerButton, opacity: isSubmittingRole ? 0.6 : 1, cursor: isSubmittingRole ? 'not-allowed' : 'pointer'}}>Cancel</button>
                </div>
              </form>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={inlineCardWrap}>
      <div style={modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#0f172a" }}>{title}</h3>
          <button type="button" onClick={onClose} style={secondaryButton}>Back</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function PermissionToggle({ option, checked, onChange, disabled = false }) {
  const kind = actionKindFromOption(option);
  const meta = ACTION_META[kind] || ACTION_META.access;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={option.label}
      style={permissionPill(checked, disabled, kind)}
    >
      <Icon style={{ fontSize: 12 }} />
      <span>{meta.label}</span>
    </button>
  );
}

const pageStyle = { padding: 14, fontFamily: "Segoe UI, Arial, sans-serif" };
const heroCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const tableCardStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflowX: "auto", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" };
const thStyle = { padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px 12px", borderTop: "1px solid #e2e8f0", verticalAlign: "top" };
const serialBadge = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 34, height: 26, borderRadius: 8, background: "#ecfeff", color: "#0f766e", fontWeight: 800, border: "1px solid #99f6e4" };
const roleBadge = (isAdmin = false) => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 26,
  padding: "4px 10px",
  borderRadius: 999,
  background: isAdmin ? "#fef2f2" : "#eff6ff",
  color: isAdmin ? "#991b1b" : "#1d4ed8",
  border: `1px solid ${isAdmin ? "#fecaca" : "#bfdbfe"}`,
  fontWeight: 800,
  whiteSpace: "nowrap",
});
const primaryButton = { border: "none", background: "#0f766e", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "none", background: "#1e293b", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const dangerButton = { border: "none", background: "#dc2626", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const miniBlue = { border: "none", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "6px 10px", marginRight: 8, cursor: "pointer" };
const miniRed = { border: "none", background: "#dc2626", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
const miniGreen = { border: "none", background: "#0f766e", color: "#fff", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontWeight: 700 };
const miniSlate = { border: "none", background: "#475569", color: "#fff", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontWeight: 700 };
const miniRedSoft = { border: "none", background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontWeight: 800 };
const inlineCardWrap = { marginTop: 16 };
const modalCard = { width: "100%", maxWidth: 1180, overflowY: "auto", background: "#f8fafc", borderRadius: 18, padding: 20, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", border: "1px solid #e2e8f0" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" };
const accessToolbar = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" };
const accessHint = { color: "#475569", fontSize: 12, fontWeight: 700 };
const securityCard = { marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 };
const sectionHeaderRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" };
const accessCountBadge = { display: "inline-flex", alignItems: "center", minHeight: 30, padding: "6px 12px", borderRadius: 999, background: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 800, fontSize: 13 };
const groupGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 };
const groupCard = { border: "1px solid #dbe4ea", borderRadius: 14, padding: 14, background: "#fff" };
const groupTitle = { fontWeight: 800, color: "#0f172a", marginBottom: 8, fontSize: 14 };
const checkRow = { display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: "#334155" };
const checkBlock = { padding: "4px 0 8px" };
const checkLabel = { fontWeight: 700, color: "#0f172a", marginBottom: 4 };
const actionRowWrap = { display: "flex", gap: 10, flexWrap: "wrap" };
const actionRow = { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16, flexWrap: "wrap" };
const iconButton = (background) => ({
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 8,
  background,
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  marginRight: 8,
});
const permissionColors = {
  view: ["#eff6ff", "#1d4ed8", "#bfdbfe"],
  create: ["#ecfdf5", "#047857", "#a7f3d0"],
  edit: ["#fff7ed", "#b45309", "#fed7aa"],
  delete: ["#fef2f2", "#b91c1c", "#fecaca"],
  export: ["#f0fdfa", "#0f766e", "#99f6e4"],
  manage: ["#f8fafc", "#334155", "#cbd5e1"],
  access: ["#f8fafc", "#334155", "#cbd5e1"],
  all: ["#f5f3ff", "#6d28d9", "#ddd6fe"],
};
const permissionPill = (checked, disabled, kind = "access") => {
  const [bg, color, border] = permissionColors[kind] || permissionColors.access;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    border: `1px solid ${checked ? color : border}`,
    borderRadius: 8,
    background: checked ? bg : "#fff",
    color: checked ? color : "#475569",
    padding: "5px 8px",
    fontSize: 12,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
};
