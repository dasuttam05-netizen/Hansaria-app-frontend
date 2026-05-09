import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

const PERMISSION_GROUPS = [
  {
    key: "operations",
    title: "Operations",
    items: [
      { key: "inward_access", label: "Inward", permissions: ["inward.view", "inward.create", "inward.edit", "inward.delete"] },
      { key: "outward_access", label: "Outward", permissions: ["outward.view", "outward.create", "outward.edit", "outward.delete"] },
      { keay: "adjustment_access", label: "Outward Adjustment", permissions: ["adjustment.manage"] },
      { key: "settlement_access", label: "Settlement", permissions: ["settlement.view"] },
      { key: "expense_access", label: "Expense Entry", permissions: ["expense.entry", "expense.create", "expense.edit", "expense.delete"] },
      { key: "expense_posted_inward_access", label: "Expense to Inward Posted", permissions: ["expense.postedInward"] },
      { key: "expense_palti_access", label: "Palti Lorry", permissions: ["expense.palti"] },
      { key: "expense_self_loading_access", label: "Self Loading", permissions: ["expense.selfLoading"] },
      { key: "expense_local_sale_access", label: "Local Sale", permissions: ["expense.localSale"] },
      { key: "expense_pending_access", label: "Expenses Pending", permissions: ["expense.pending"] },
      { key: "cash_access", label: "Cash Book", permissions: ["cash.view", "cash.create", "cash.edit", "cash.delete"] },
      { key: "transport_access", label: "Transport", permissions: ["transport.manage"] },
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

const getActionOptions = (groupKey, item) => {
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
  if (groupKey === "masters") {
    if (item.key === "employees_non_admin_edit") {
      return [{ id: `${item.key}:edit`, label: "Edit", permission: item.permissions[0] || null }];
    }
    return [{ id: `${item.key}:view`, label: "View", permission: item.permissions[0] || null }];
  }
  return [{ id: item.key, label: item.label, permission: item.permissions[0] || null }];
};

const ALL_ACTION_OPTIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => getActionOptions(group.key, item))
);

const flattenPermissionsFromToggles = (toggles) =>
  Array.from(new Set(ALL_ACTION_OPTIONS.flatMap((option) => (toggles[option.id] && option.permission ? [option.permission] : []))));

const togglesFromPermissions = (permissions = []) => {
  const permissionSet = new Set(permissions || []);
  return ALL_ACTION_OPTIONS.reduce((acc, option) => {
    acc[option.id] = !!option.permission && permissionSet.has(option.permission);
    return acc;
  }, {});
};

const createDefaultFormData = () => ({
  name: "",
  address: "",
  username: "",
  password: "",
  location_id: "",
  role: "",
  permissions: ["dashboard.view"],
  opening_balance: "0",
  opening_balance_type: "dr",
  assigned_warehouse_ids: [],
});

const createRoleForm = () => ({
  name: "",
  toggles: togglesFromPermissions(["dashboard.view"]),
  is_admin: false,
});

// Normalize data from backend - convert _id to id if needed
const normalizeData = (data) => {
  if (!data) return null;
  return {
    ...data,
    id: data.id || data._id,
  };
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeData);
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

  const fetchEmployees = async () => {
  const res = await axios.get("/api/employees");

  setEmployees(
    normalizeArray(res.data || [])
  );
};

  const fetchRoles = async () => {
  const res = await axios.get("/api/roles");

  setRoles(
    normalizeArray(res.data || [])
  );
};

  const fetchMeta = async () => {
  const [locationRes, warehouseRes] =
    await Promise.all([
      axios.get("/api/locations"),
      axios.get("/api/warehouses")
    ]);

  setLocations(
    normalizeArray(locationRes.data || [])
  );

  setWarehouses(
    normalizeArray(warehouseRes.data || [])
  );
};

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchRoles(), fetchMeta()]).catch((err) => {
      console.error(err);
      alert("Failed to load users and security data");
    });
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

  const permissionSummary = useMemo(() => {
    const selected = flattenPermissionsFromToggles(employeeToggles);
    return selected.length ? selected.join(", ") : "No access selected";
  }, [employeeToggles]);

  const resetEmployeeForm = () => {
    setFormData(createDefaultFormData());
    setEmployeeToggles(togglesFromPermissions(["dashboard.view"]));
    setEditId(null);
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

 const handleSubmitEmployee = async (e) => {
  e.preventDefault();

  if (isSubmittingEmployee) return;

  // Validate location
  if (!formData.location_id || formData.location_id === "") {
    alert("Please select a location");
    return;
  }

  const permissions =
    flattenPermissionsFromToggles(employeeToggles);

  const payload = {
    ...formData,

    // MongoDB ObjectId
    location_id: formData.location_id,

    role: formData.role || "Custom Role",

    permissions,

    // Keep ObjectId strings
    assigned_warehouse_ids:
      formData.assigned_warehouse_ids || [],
  };

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

  const handleEditEmployee = (employee) => {
    // Validate employee object and ID
    if (!employee || !employee.id) {
      alert("Invalid employee data. Cannot edit.");
      console.error("Edit attempted with invalid employee:", employee);
      return;
    }

    const employeeIsAdmin =
      String(employee?.role || "").toLowerCase() === "admin" ||
      (Array.isArray(employee?.permissions) && employee.permissions.includes("all"));
    if (!isAdminUser && employeeIsAdmin) {
      alert("Only admin can edit admin account");
      return;
    }

   const assignedWarehouseIds = warehouses
  .filter(
    (item) =>
      String(item.employee_id) ===
      String(employee.id || employee._id)
  )
  .map((item) =>
    String(item._id || item.id)
  );
    setFormData({
      name: employee.name || "",
      address: employee.address || "",
      username: employee.username || "",
      password: "",
      location_id: String(employee.location_id || ""),
      role: employee.role || "",
      permissions: employee.permissions || [],
      opening_balance: String(employee.opening_balance || 0),
      opening_balance_type: employee.opening_balance_type || "dr",
      assigned_warehouse_ids: assignedWarehouseIds,
    });
    setEmployeeToggles(togglesFromPermissions(employee.permissions || []));
    setEditId(employee.id);
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
            Create/edit employee users, define roles, and control access with checkboxes. Users will only have access to the items you tick.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canCreateEmployee ? <button type="button" onClick={() => setShowEmployeeForm(true)} style={primaryButton}>New User</button> : null}
          {canManageRoles ? <button type="button" onClick={() => setShowRoleManager(true)} style={secondaryButton}>Roles</button> : null}
        </div>
      </div>

      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Warehouse</th>
              <th style={thStyle}>Access</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => {
              const assignedNames = warehouses
  .filter(
    (item) =>
      String(item.employee_id) ===
      String(employee.id || employee._id)
  )
  .map((item) => item.name)
  .join(", ");
              const employeeIsAdmin =
                String(employee?.role || "").toLowerCase() === "admin" ||
                (Array.isArray(employee?.permissions) && employee.permissions.includes("all"));
              const canEditThisEmployee = canEditEmployee && (isAdminUser || !employeeIsAdmin);
              return (
                <tr key={employee.id} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={tdStyle}>{employee.id}</td>
                  <td style={tdStyle}>{employee.name}</td>
                  <td style={tdStyle}>{employee.username}</td>
                  <td style={tdStyle}>{employee.role || "-"}</td>
                  <td style={tdStyle}>
  {
    locations.find(
      (item) =>
        String(item._id || item.id) ===
        String(employee.location_id)
    )?.name || "-"
  }
</td>
                  <td style={tdStyle}>{assignedNames || "-"}</td>
                  <td style={tdStyle}>{Array.isArray(employee.permissions) ? employee.permissions.join(", ") : "-"}</td>
                  <td style={tdStyle}>
                    {canEditThisEmployee ? <button type="button" onClick={() => handleEditEmployee(employee)} style={miniBlue}>Edit</button> : null}
                    {canDeleteEmployee && employee.id ? <button type="button" onClick={() => handleDeleteEmployee(employee.id)} style={miniRed}>Delete</button> : null}
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
              <Field label="Username"><input name="username" value={formData.username} onChange={handleEmployeeChange} style={inputStyle} /></Field>
              <Field label="Password"><input type="password" name="password" value={formData.password} onChange={handleEmployeeChange} style={inputStyle} /></Field>
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
              <Field label="Location">
  <select
    name="location_id"
    value={formData.location_id}
    onChange={handleEmployeeChange}
    style={inputStyle}
  >
    <option value="">
      Select Location
    </option>

    {locations.map((location) => (
      <option
        key={location._id || location.id}
        value={location._id || location.id}
      >
        {location.name}
      </option>
    ))}
  </select>
</Field>
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
                <MultiSelectDropdown
                  label="Assigned Warehouses"
                  options={warehouseOptions}
                  value={formData.assigned_warehouse_ids}
                  onChange={(next) => setFormData((prev) => ({ ...prev, assigned_warehouse_ids: next }))}
                  placeholder="Select Warehouses"
                />
              </div>
            </div>

            <div style={securityCard}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Access Control List</div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>{permissionSummary}</div>
              <div style={groupGrid}>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.key} style={groupCard}>
                    <div style={groupTitle}>{group.title}</div>
                    {group.items.map((item) => (
                      <div key={item.key} style={checkBlock}>
                        <div style={checkLabel}>{item.label}</div>
                        <div style={actionRowWrap}>
                              {getActionOptions(group.key, item).map((option) => (
                                <label key={option.id} style={checkRow}>
                                  <input
                                    type="checkbox"
                                    checked={!!employeeToggles[option.id]}
                                    onChange={() => handleEmployeeToggle(option.id)}
                                    disabled={!isAdminUser}
                                  />
                                  <span>{option.label}</span>
                                </label>
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
        <Modal onClose={() => { setShowRoleManager(false); resetRoleForm(); }} title="Roles">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#64748b" }}>Create or edit roles. Employee create er time à¦¶à§à¦§à§ role select à¦•à¦°à¦²à§‡à¦‡ access fill à¦¹à§Ÿà§‡ à¦¯à¦¾à¦¬à§‡.</div>
            <button type="button" onClick={() => setShowRoleEditor(true)} style={primaryButton}>New Role</button>
          </div>
          <div style={tableCardStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Permissions</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td style={tdStyle}>{role.name}</td>
                    <td style={tdStyle}>{(role.permissions || []).join(", ") || "-"}</td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => handleEditRole(role)} style={miniBlue}>Edit</button>
                      {role.id ? <button type="button" onClick={() => handleDeleteRole(role.id)} style={miniRed}>Delete</button> : null}
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
                  <div style={groupGrid}>
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.key} style={groupCard}>
                        <div style={groupTitle}>{group.title}</div>
                        {group.items.map((item) => (
                          <div key={item.key} style={checkBlock}>
                            <div style={checkLabel}>{item.label}</div>
                            <div style={actionRowWrap}>
                              {getActionOptions(group.key, item).map((option) => (
                                <label key={option.id} style={checkRow}>
                                  <input type="checkbox" checked={!!roleForm.toggles[option.id]} onChange={() => handleRoleToggle(option.id)} />
                                  <span>{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
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

const pageStyle = { padding: 14, fontFamily: "Segoe UI, Arial, sans-serif" };
const heroCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const tableCardStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflowX: "auto", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" };
const thStyle = { padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px 12px", borderTop: "1px solid #e2e8f0", verticalAlign: "top" };
const primaryButton = { border: "none", background: "#0f766e", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "none", background: "#1e293b", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const dangerButton = { border: "none", background: "#dc2626", color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const miniBlue = { border: "none", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "6px 10px", marginRight: 8, cursor: "pointer" };
const miniRed = { border: "none", background: "#dc2626", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" };
const inlineCardWrap = { marginTop: 16 };
const modalCard = { width: "100%", maxWidth: 1180, overflowY: "auto", background: "#f8fafc", borderRadius: 18, padding: 20, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", border: "1px solid #e2e8f0" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" };
const securityCard = { marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 };
const groupGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 };
const groupCard = { border: "1px solid #dbe4ea", borderRadius: 14, padding: 14, background: "#fff" };
const groupTitle = { fontWeight: 800, color: "#0f172a", marginBottom: 8, fontSize: 14 };
const checkRow = { display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: "#334155" };
const checkBlock = { padding: "4px 0 8px" };
const checkLabel = { fontWeight: 700, color: "#0f172a", marginBottom: 4 };
const actionRowWrap = { display: "flex", gap: 10, flexWrap: "wrap" };
const actionRow = { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16, flexWrap: "wrap" };



