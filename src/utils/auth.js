import axios from "axios";

export const ROLE_PERMISSION_PRESETS = {
  admin: ["all"],
  bm: [
    "dashboard.view",
    "employees.view",
    "employees.edit.non_admin",
    "companies.view",
    "companies.create",
    "companies.edit",
    "companies.delete",
    "companyAccounts.view",
    "companyAccounts.create",
    "companyAccounts.edit",
    "companyAccounts.delete",
    "locations.view",
    "locations.create",
    "locations.edit",
    "locations.delete",
    "warehouses.view",
    "warehouses.create",
    "warehouses.edit",
    "warehouses.delete",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "farmers.view",
    "farmers.create",
    "farmers.edit",
    "farmers.delete",
    "inward.view",
    "inward.create",
    "inward.edit",
    "inward.delete",
    "inward.import",
    "inward.export",
    "outward.view",
    "outward.create",
    "outward.edit",
    "outward.delete",
    "outward.import",
    "outward.export",
    "adjustment.manage",
    "settlement.view",
    "settlement.companyRate",
    "expense.entry",
    "expense.view",
    "expense.create",
    "expense.edit",
    "expense.delete",
    "buyerNames.view",
    "buyerNames.create",
    "buyerNames.edit",
    "buyerNames.delete",
    "consigneeNames.view",
    "consigneeNames.create",
    "consigneeNames.edit",
    "consigneeNames.delete",
    "expense.postedInward",
    "expense.palti",
    "expense.selfLoading",
    "expense.localSale",
    "expense.pending",
    "cash.pending.post",
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
    "warehouse.trading.view",
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
    "report.inward",
    "report.erp",
    "report.partyLedger",
    "report.partyStock",
    "report.warehouseRentLedger",
    "report.warehouseRentMonthEnd",
    "report.outwardSettlement",
    "report.expense",
    "report.paltiLorryAdjustment",
    "report.cash",
    "transport.manage",
  ],
  ho: [
    "dashboard.view",
    "employees.view",
    "employees.edit.non_admin",
    "companies.view",
    "companies.create",
    "companies.edit",
    "companies.delete",
    "companyAccounts.view",
    "companyAccounts.create",
    "companyAccounts.edit",
    "companyAccounts.delete",
    "locations.view",
    "locations.create",
    "locations.edit",
    "locations.delete",
    "warehouses.view",
    "warehouses.create",
    "warehouses.edit",
    "warehouses.delete",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "farmers.view",
    "farmers.create",
    "farmers.edit",
    "farmers.delete",
    "inward.view",
    "inward.create",
    "inward.edit",
    "inward.delete",
    "inward.import",
    "inward.export",
    "outward.view",
    "outward.create",
    "outward.edit",
    "outward.delete",
    "outward.import",
    "outward.export",
    "adjustment.manage",
    "settlement.view",
    "settlement.companyRate",
    "expense.entry",
    "expense.view",
    "expense.create",
    "expense.edit",
    "expense.delete",
    "buyerNames.view",
    "buyerNames.create",
    "buyerNames.edit",
    "buyerNames.delete",
    "consigneeNames.view",
    "consigneeNames.create",
    "consigneeNames.edit",
    "consigneeNames.delete",
    "expense.postedInward",
    "expense.palti",
    "expense.selfLoading",
    "expense.localSale",
    "expense.pending",
    "cash.pending.post",
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
    "warehouse.trading.view",
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
    "report.inward",
    "report.erp",
    "report.partyLedger",
    "report.partyStock",
    "report.warehouseRentLedger",
    "report.warehouseRentMonthEnd",
    "report.outwardSettlement",
    "report.expense",
    "report.paltiLorryAdjustment",
    "report.cash",
    "transport.manage",
  ],
  manager: [
    "dashboard.view",
    "employees.view",
    "employees.edit.non_admin",
    "companies.manage",
    "companyAccounts.manage",
    "locations.manage",
    "warehouses.manage",
    "products.manage",
    "inward.view",
    "inward.create",
    "inward.edit",
    "inward.delete",
    "inward.import",
    "inward.export",
    "outward.view",
    "outward.create",
    "outward.edit",
    "outward.delete",
    "outward.import",
    "outward.export",
    "adjustment.manage",
    "settlement.view",
    "settlement.companyRate",
    "expense.entry",
    "expense.view",
    "expense.create",
    "expense.edit",
    "expense.delete",
    "buyerNames.view",
    "buyerNames.create",
    "buyerNames.edit",
    "buyerNames.delete",
    "consigneeNames.view",
    "consigneeNames.create",
    "consigneeNames.edit",
    "consigneeNames.delete",
    "expense.postedInward",
    "expense.palti",
    "expense.selfLoading",
    "expense.localSale",
    "expense.pending",
    "cash.pending.post",
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
    "report.inward",
    "report.erp",
    "report.partyLedger",
    "report.partyStock",
    "report.warehouseRentLedger",
    "report.warehouseRentMonthEnd",
    "report.outwardSettlement",
    "report.expense",
    "report.paltiLorryAdjustment",
    "report.cash",
    "transport.manage",
  ],
  staff: [
    "dashboard.view",
    "inward.view",
    "inward.create",
    "outward.view",
    "outward.create",
    "adjustment.manage",
    "settlement.view",
    "cash.view",
    "warehouse.trading.view",
    "report.inward",
    "report.outwardSettlement",
  ],
  viewer: [
    "dashboard.view",
    "dropdown.view",
    "employees.view",
    "companies.view",
    "companyAccounts.view",
    "warehouses.view",
    "products.view",
    "consigneeNames.view",
    "buyerNames.view",
    "farmers.view",
    "report.inward",
  ],
};

export function normalizeRole(role = "staff") {
  const normalized = String(role || "").trim().toLowerCase();
  return ROLE_PERMISSION_PRESETS[normalized] ? normalized : String(role || "staff").trim() || "staff";
}

const PERMISSION_DEPENDENCIES = {};

const LEGACY_PERMISSION_MAP = {
  "employees.create": ["employees.manage"],
  "employees.edit": ["employees.manage"],
  "employees.delete": ["employees.manage"],
  "inward.view": ["inward.manage"],
  "inward.create": ["inward.manage"],
  "inward.edit": ["inward.manage"],
  "inward.delete": ["inward.manage"],
  "inward.import": ["inward.manage"],
  "inward.export": ["inward.manage"],
  "outward.view": ["outward.manage"],
  "outward.create": ["outward.manage"],
  "outward.edit": ["outward.manage"],
  "outward.delete": ["outward.manage"],
  "outward.import": ["outward.manage"],
  "outward.export": ["outward.manage"],
  "expense.view": ["expense.manage", "expense.entry"],
  "expense.create": ["expense.manage", "expense.entry"],
  "expense.edit": ["expense.manage"],
  "expense.delete": ["expense.manage"],
  "expense.entry": ["expense.view", "expense.manage"],
  "buyerNames.view": ["outward.view", "outward.create", "outward.edit", "adjustment.manage", "expense.view", "expense.create", "expense.edit", "expense.entry"],
  "buyerNames.create": ["buyerNames.view"],
  "buyerNames.edit": ["buyerNames.view"],
  "buyerNames.delete": ["buyerNames.view"],
  "consigneeNames.view": ["outward.view", "outward.create", "outward.edit", "adjustment.manage", "expense.view", "expense.create", "expense.edit", "expense.entry"],
  "consigneeNames.create": ["consigneeNames.view"],
  "consigneeNames.edit": ["consigneeNames.view"],
  "consigneeNames.delete": ["consigneeNames.view"],
  "expense.postedInward": ["expense.view", "inward.view"],
  "expense.palti": ["expense.view", "report.expense"],
  "expense.selfLoading": ["expense.view", "report.expense", "outward.view"],
  "expense.localSale": ["expense.view", "report.expense"],
  "expense.pending": ["cash.view"],
  "cash.pending.post": [],
  "cash.view": ["cash.mainBook.view", "cash.partiesBook.view", "cash.employeeBook.view"],
  "cash.create": ["cash.mainBook.create", "cash.partiesBook.create", "cash.employeeBook.create"],
  "cash.edit": ["cash.mainBook.edit", "cash.partiesBook.edit", "cash.employeeBook.edit"],
  "cash.delete": ["cash.mainBook.delete", "cash.partiesBook.delete", "cash.employeeBook.delete"],
  "cash.mainBook.view": ["cash.view"],
  "cash.mainBook.create": ["cash.create"],
  "cash.mainBook.edit": ["cash.edit"],
  "cash.mainBook.delete": ["cash.delete"],
  "cash.partiesBook.view": ["cash.view"],
  "cash.partiesBook.create": ["cash.create"],
  "cash.partiesBook.edit": ["cash.edit"],
  "cash.partiesBook.delete": ["cash.delete"],
  "cash.employeeBook.view": ["cash.view"],
  "cash.employeeBook.create": ["cash.create"],
  "cash.employeeBook.edit": ["cash.edit"],
  "cash.employeeBook.delete": ["cash.delete"],
  "settlement.view": ["reports.view"],
  "settlement.companyRate": ["settlement.view"],
  "report.inward": ["reports.view"],
  "report.erp": ["reports.view"],
  "report.partyLedger": ["reports.view"],
  "report.partyStock": ["reports.view"],
  "report.warehouseRentLedger": ["reports.view"],
  "report.warehouseRentMonthEnd": ["reports.view"],
  "report.outwardSettlement": ["reports.view"],
  "report.expense": ["reports.view"],
  "report.paltiLorryAdjustment": ["report.expense", "reports.view"],
  "report.cash": ["reports.view"],
  "warehouses.view": ["warehouses.manage"],
  "farmers.view": ["farmers.manage"],
  "farmers.create": ["farmers.manage"],
  "farmers.edit": ["farmers.manage"],
  "farmers.delete": ["farmers.manage"],
  "warehouse.trading.view": [
    "warehouse.trading.purchase.view",
    "warehouse.trading.sale.view",
    "warehouse.trading.payment.view",
    "warehouse.trading.receipt.view",
    "warehouse.trading.journal.view",
  ],
  "warehouse.trading.manage": [],
  "warehouse.trading.purchase.view": [],
  "warehouse.trading.purchase.manage": [
    "warehouse.trading.purchase.view",
    "warehouse.trading.purchase.create",
    "warehouse.trading.purchase.edit",
    "warehouse.trading.purchase.delete",
  ],
  "warehouse.trading.sale.view": [],
  "warehouse.trading.sale.manage": [
    "warehouse.trading.sale.view",
    "warehouse.trading.sale.create",
    "warehouse.trading.sale.edit",
    "warehouse.trading.sale.delete",
  ],
  "warehouse.trading.payment.view": [],
  "warehouse.trading.payment.manage": [
    "warehouse.trading.payment.view",
    "warehouse.trading.payment.create",
    "warehouse.trading.payment.edit",
    "warehouse.trading.payment.delete",
  ],
  "warehouse.trading.receipt.view": [],
  "warehouse.trading.receipt.manage": [
    "warehouse.trading.receipt.view",
    "warehouse.trading.receipt.create",
    "warehouse.trading.receipt.edit",
    "warehouse.trading.receipt.delete",
  ],
  "warehouse.trading.journal.view": [],
  "warehouse.trading.journal.manage": [
    "warehouse.trading.journal.view",
    "warehouse.trading.journal.create",
    "warehouse.trading.journal.edit",
    "warehouse.trading.journal.delete",
  ],
  "warehouse.trading.report.sale": ["warehouse.trading.sale.view"],
  "warehouse.trading.report.purchase": ["warehouse.trading.purchase.view"],
  "warehouse.trading.report.profitLoss": ["warehouse.trading.purchase.view", "warehouse.trading.sale.view"],
  "warehouse.trading.purchase.create": [],
  "warehouse.trading.purchase.edit": [],
  "warehouse.trading.purchase.delete": [],
  "warehouse.trading.sale.create": [],
  "warehouse.trading.sale.edit": [],
  "warehouse.trading.sale.delete": [],
  "warehouse.trading.payment.create": [],
  "warehouse.trading.payment.edit": [],
  "warehouse.trading.payment.delete": [],
  "warehouse.trading.receipt.create": [],
  "warehouse.trading.receipt.edit": [],
  "warehouse.trading.receipt.delete": [],
  "warehouse.trading.journal.create": [],
  "warehouse.trading.journal.edit": [],
  "warehouse.trading.journal.delete": [],
};

function expandPermissions(permissions = []) {
  const expanded = new Set(permissions || []);

  const addDependencies = (permission) => {
    const deps = LEGACY_PERMISSION_MAP[permission] || PERMISSION_DEPENDENCIES[permission] || [];
    deps.forEach((dep) => {
      if (!expanded.has(dep)) {
        expanded.add(dep);
        addDependencies(dep);
      }
    });
  };

  [...expanded].forEach(addDependencies);
  return [...expanded];
}

function sanitizePermissionList(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function parsePermissionInput(permissions) {
  if (Array.isArray(permissions)) {
    return sanitizePermissionList(permissions);
  }

  if (typeof permissions === "string") {
    const raw = permissions.trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return sanitizePermissionList(parsed);
      }
    } catch (_err) {
      // Fall back to comma-separated values.
    }

    return sanitizePermissionList(raw.split(","));
  }

  return null;
}

const TOKEN_KEY = "token";
const USER_KEY = "authUser";
const LAST_ACTIVITY_KEY = "lastActivityAt";

export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export function touchSessionActivity() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    return;
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getSessionIdleRemainingMs() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return null;
  }

  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  if (!lastActivity) {
    return SESSION_IDLE_TIMEOUT_MS;
  }

  return Math.max(0, SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivity));
}

export function isSessionIdleExpired() {
  const remaining = getSessionIdleRemainingMs();
  return remaining !== null && remaining <= 0;
}

export function normalizePermissions(role = "staff", permissions = []) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    return ["all"];
  }

  const parsedPermissions = parsePermissionInput(permissions);
  if (parsedPermissions !== null) {
    if (parsedPermissions.length > 0) {
      return expandPermissions(parsedPermissions);
    }

    return expandPermissions(ROLE_PERMISSION_PRESETS[normalizedRole] || ROLE_PERMISSION_PRESETS.staff);
  }

  return expandPermissions(ROLE_PERMISSION_PRESETS[normalizedRole] || ROLE_PERMISSION_PRESETS.staff);
}

export function applyAuthToken(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

export function saveSession(token, user) {
  const normalizedUser = {
    ...user,
    role: normalizeRole(user?.role || "staff"),
    permissions: normalizePermissions(user?.role, user?.permissions),
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  touchSessionActivity();
  applyAuthToken(token);

  return normalizedUser;
}

export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    applyAuthToken(null);
    return { token: null, user: null };
  }

  if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
    touchSessionActivity();
  } else if (isSessionIdleExpired()) {
    clearSession();
    return { token: null, user: null };
  }

  try {
    const parsedUser = JSON.parse(rawUser);
    const user = {
      ...parsedUser,
      role: normalizeRole(parsedUser?.role || "staff"),
      permissions: normalizePermissions(parsedUser?.role, parsedUser?.permissions),
    };

    applyAuthToken(token);
    return { token, user };
  } catch (error) {
    clearSession();
    return { token: null, user: null };
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  applyAuthToken(null);
}

export function hasPermission(user, permission) {
  if (!user || !permission) {
    return false;
  }

  const permissions = normalizePermissions(user.role, user.permissions);
  return (
    ["admin"].includes(normalizeRole(user.role)) ||
    permissions.includes("all") ||
    permissions.includes(permission)
  );
}

export function hasAnyPermission(user, permissions = []) {
  return (permissions || []).some((permission) => hasPermission(user, permission));
}
