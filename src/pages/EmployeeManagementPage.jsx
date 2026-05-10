import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

const PERMISSION_GROUPS = [
  {
    key: "operations",
    title: "Operations",
    items: [
      {
        key: "inward_access",
        label: "Inward",
        permissions: [
          "inward.view",
          "inward.create",
          "inward.edit",
          "inward.delete",
        ],
      },
      {
        key: "outward_access",
        label: "Outward",
        permissions: [
          "outward.view",
          "outward.create",
          "outward.edit",
          "outward.delete",
        ],
      },
      {
        key: "adjustment_access",
        label: "Outward Adjustment",
        permissions: ["adjustment.manage"],
      },
      {
        key: "settlement_access",
        label: "Settlement",
        permissions: ["settlement.view"],
      },
      {
        key: "expense_access",
        label: "Expense Entry",
        permissions: [
          "expense.entry",
          "expense.create",
          "expense.edit",
          "expense.delete",
        ],
      },
      {
        key: "cash_access",
        label: "Cash Book",
        permissions: [
          "cash.view",
          "cash.create",
          "cash.edit",
          "cash.delete",
        ],
      },
    ],
  },
  {
    key: "masters",
    title: "Masters",
    items: [
      {
        key: "employees_manage",
        label: "Employees",
        permissions: ["employees.view"],
      },
      {
        key: "dashboard_view",
        label: "Dashboard",
        permissions: ["dashboard.view"],
      },
    ],
  },
];

const ALL_PERMISSION_ITEMS = PERMISSION_GROUPS.flatMap(
  (group) => group.items
);

const ACTIONS = ["view", "create", "edit", "delete"];

const getActionOptions = (groupKey, item) => {
  if (groupKey === "operations") {
    const options = ACTIONS.map((action) => {
      const direct = item.permissions.find((permission) =>
        permission.endsWith(`.${action}`)
      );

      return {
        id: `${item.key}:${action}`,
        label:
          action.charAt(0).toUpperCase() + action.slice(1),
        permission:
          direct || item.permissions[0] || null,
      };
    }).filter(
      (option, index, arr) =>
        option.permission &&
        arr.findIndex(
          (x) => x.permission === option.permission
        ) === index
    );

    if (item.permissions.length > 1) {
      return options;
    }

    return [
      {
        id: `${item.key}:access`,
        label: "Access",
        permission: item.permissions[0] || null,
      },
    ];
  }

  return [
    {
      id: item.key,
      label: item.label,
      permission: item.permissions[0] || null,
    },
  ];
};

const ALL_ACTION_OPTIONS =
  PERMISSION_GROUPS.flatMap((group) =>
    group.items.flatMap((item) =>
      getActionOptions(group.key, item)
    )
  );

const flattenPermissionsFromToggles = (toggles) =>
  Array.from(
    new Set(
      ALL_ACTION_OPTIONS.flatMap((option) =>
        toggles[option.id] && option.permission
          ? [option.permission]
          : []
      )
    )
  );

const togglesFromPermissions = (
  permissions = []
) => {
  const permissionSet = new Set(permissions || []);

  return ALL_ACTION_OPTIONS.reduce(
    (acc, option) => {
      acc[option.id] =
        !!option.permission &&
        permissionSet.has(option.permission);

      return acc;
    },
    {}
  );
};

const createDefaultFormData = () => ({
  employee_id: "",
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

export default function EmployeeManagementPage() {
  const { user: currentUser } = loadSession();

  const isAdminUser =
    hasPermission(currentUser, "all");

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] =
    useState([]);

  const [showEmployeeForm, setShowEmployeeForm] =
    useState(false);

  const [formData, setFormData] = useState(
    createDefaultFormData()
  );

  const [employeeToggles, setEmployeeToggles] =
    useState(
      togglesFromPermissions(["dashboard.view"])
    );

  const [editId, setEditId] = useState(null);

  // ========================
  // FETCH FUNCTIONS
  // ========================

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        "/api/employees"
      );

      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/api/roles");

      setRoles(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeta = async () => {
    try {
      const [locationRes, warehouseRes] =
        await Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/warehouses"),
        ]);

      setLocations(locationRes.data || []);
      setWarehouses(warehouseRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
    fetchMeta();
  }, []);

  // ========================
  // OPTIONS
  // ========================

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((item) => ({
        value: String(item._id || item.id),
        label: item.name,
      })),
    [warehouses]
  );

  // ========================
  // HANDLE CHANGE
  // ========================

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;

    if (name === "role") {
      const selectedRole = roles.find(
        (item) =>
          String(item._id || item.id) ===
          String(value)
      );

      if (selectedRole) {
        const selectedPermissions =
          selectedRole.permissions || [];

        setFormData((prev) => ({
          ...prev,
          role: selectedRole.name,
        }));

        setEmployeeToggles(
          togglesFromPermissions(
            selectedPermissions
          )
        );
      }

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmployeeToggle = (key) => {
    setEmployeeToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ========================
  // SAVE EMPLOYEE
  // ========================

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();

    const permissions =
      flattenPermissionsFromToggles(
        employeeToggles
      );

    const payload = {
      employee_id: formData.employee_id,
      name: formData.name,
      address: formData.address,
      username: formData.username,
      password: formData.password,
      location_id: formData.location_id,
      role: formData.role || "Custom",
      permissions,
      opening_balance:
        Number(formData.opening_balance) || 0,
      opening_balance_type:
        formData.opening_balance_type,
      assigned_warehouse_ids:
        formData.assigned_warehouse_ids || [],
    };

    if (
      !payload.employee_id ||
      !payload.name ||
      !payload.username
    ) {
      alert(
        "Employee Code, Name & Username required"
      );

      return;
    }

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

      alert("Employee saved successfully");

      fetchEmployees();

      resetEmployeeForm();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.error ||
          "Failed to save employee"
      );
    }
  };

  // ========================
  // EDIT
  // ========================

  const handleEditEmployee = (employee) => {
    const assignedWarehouseIds = warehouses
      .filter(
        (item) =>
          String(item.employee_id) ===
          String(employee._id || employee.id)
      )
      .map((item) =>
        String(item._id || item.id)
      );

    setFormData({
      employee_id:
        employee.employee_id || "",
      name: employee.name || "",
      address: employee.address || "",
      username: employee.username || "",
      password: "",
      location_id:
        employee.location_id || "",
      role: employee.role || "",
      permissions:
        employee.permissions || [],
      opening_balance: String(
        employee.opening_balance || 0
      ),
      opening_balance_type:
        employee.opening_balance_type ||
        "dr",
      assigned_warehouse_ids:
        assignedWarehouseIds,
    });

    setEmployeeToggles(
      togglesFromPermissions(
        employee.permissions || []
      )
    );

    setEditId(
      String(employee._id || employee.id)
    );

    setShowEmployeeForm(true);
  };

  // ========================
  // DELETE
  // ========================

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Delete employee?"))
      return;

    try {
      await axios.delete(
        `/api/employees/${id}`
      );

      fetchEmployees();
    } catch (err) {
      console.error(err);

      alert("Delete failed");
    }
  };

  // ========================
  // RESET
  // ========================

  const resetEmployeeForm = () => {
    setFormData(createDefaultFormData());

    setEmployeeToggles(
      togglesFromPermissions([
        "dashboard.view",
      ])
    );

    setEditId(null);

    setShowEmployeeForm(false);
  };

  // ========================
  // UI
  // ========================

  return (
    <div style={pageStyle}>
      <div style={heroCard}>
        <h2>User Management</h2>

        <button
          type="button"
          onClick={() =>
            setShowEmployeeForm(true)
          }
          style={primaryButton}
        >
          New User
        </button>
      </div>

      {/* TABLE */}

      <div style={tableCardStyle}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#0f766e",
                color: "#fff",
              }}
            >
              <th style={thStyle}>Emp.Code</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee, index) => (
              <tr
                key={
                  employee._id || employee.id
                }
                style={{
                  background:
                    index % 2 === 0
                      ? "#fff"
                      : "#f8fafc",
                }}
              >
                <td style={tdStyle}>
                  {employee.employee_id ||
                    "-"}
                </td>

                <td style={tdStyle}>
                  {employee.name}
                </td>

                <td style={tdStyle}>
                  {employee.username}
                </td>

                <td style={tdStyle}>
                  {employee.role || "-"}
                </td>

                <td style={tdStyle}>
                  {locations.find(
                    (item) =>
                      String(
                        item._id || item.id
                      ) ===
                      String(
                        employee.location_id
                      )
                  )?.name || "-"}
                </td>

                <td style={tdStyle}>
                  <button
                    onClick={() =>
                      handleEditEmployee(
                        employee
                      )
                    }
                    style={miniBlue}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteEmployee(
                        employee._id ||
                          employee.id
                      )
                    }
                    style={miniRed}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FORM */}

      {showEmployeeForm && (
        <div style={modalCard}>
          <h3>
            {editId
              ? "Edit User"
              : "Create User"}
          </h3>

          <form
            onSubmit={handleSubmitEmployee}
          >
            <div style={formGrid}>
              <Field label="Employee Code">
                <input
                  name="employee_id"
                  value={
                    formData.employee_id
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Name">
                <input
                  name="name"
                  value={formData.name}
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Username">
                <input
                  name="username"
                  value={
                    formData.username
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  name="password"
                  value={
                    formData.password
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Role">
                <select
                  name="role"
                  value={formData.role}
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select Role
                  </option>

                  {roles.map((role) => (
                    <option
                      key={
                        role._id || role.id
                      }
                      value={
                        role._id || role.id
                      }
                    >
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Location">
                <select
                  name="location_id"
                  value={
                    formData.location_id
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select Location
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={
                          location._id ||
                          location.id
                        }
                        value={
                          location._id ||
                          location.id
                        }
                      >
                        {location.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Opening Balance">
                <input
                  name="opening_balance"
                  value={
                    formData.opening_balance
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Balance Type">
                <select
                  name="opening_balance_type"
                  value={
                    formData.opening_balance_type
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                >
                  <option value="dr">
                    Dr
                  </option>

                  <option value="cr">
                    Cr
                  </option>
                </select>
              </Field>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <Field label="Address">
                  <textarea
                    name="address"
                    value={
                      formData.address
                    }
                    onChange={
                      handleEmployeeChange
                    }
                    rows={3}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <MultiSelectDropdown
                  label="Assigned Warehouses"
                  options={
                    warehouseOptions
                  }
                  value={
                    formData.assigned_warehouse_ids
                  }
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      assigned_warehouse_ids:
                        next,
                    }))
                  }
                  placeholder="Select Warehouses"
                />
              </div>
            </div>

            {/* ACCESS */}

            <div style={securityCard}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Access Control
              </div>

              <div style={groupGrid}>
                {PERMISSION_GROUPS.map(
                  (group) => (
                    <div
                      key={group.key}
                      style={groupCard}
                    >
                      <div style={groupTitle}>
                        {group.title}
                      </div>

                      {group.items.map(
                        (item) => (
                          <div
                            key={item.key}
                            style={checkBlock}
                          >
                            <div
                              style={
                                checkLabel
                              }
                            >
                              {item.label}
                            </div>

                            <div
                              style={
                                actionRowWrap
                              }
                            >
                              {getActionOptions(
                                group.key,
                                item
                              ).map(
                                (
                                  option
                                ) => (
                                  <label
                                    key={
                                      option.id
                                    }
                                    style={
                                      checkRow
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        !!employeeToggles[
                                          option
                                            .id
                                        ]
                                      }
                                      onChange={() =>
                                        handleEmployeeToggle(
                                          option.id
                                        )
                                      }
                                    />

                                    <span>
                                      {
                                        option.label
                                      }
                                    </span>
                                  </label>
                                )
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            <div style={actionRow}>
              <button
                type="submit"
                style={primaryButton}
              >
                Save User
              </button>

              <button
                type="button"
                onClick={resetEmployeeForm}
                style={dangerButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      {children}
    </div>
  );
}

// ========================
// STYLES
// ========================

const pageStyle = {
  padding: 14,
  fontFamily: "Segoe UI",
};

const heroCard = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tableCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  overflowX: "auto",
};

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
};

const tdStyle = {
  padding: "10px 12px",
  borderTop: "1px solid #e2e8f0",
};

const primaryButton = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButton = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const miniBlue = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  marginRight: 8,
};

const miniRed = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
};

const modalCard = {
  marginTop: 20,
  background: "#f8fafc",
  borderRadius: 18,
  padding: 20,
  border: "1px solid #e2e8f0",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const securityCard = {
  marginTop: 16,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
};

const groupGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 14,
};

const groupCard = {
  border: "1px solid #dbe4ea",
  borderRadius: 14,
  padding: 14,
};

const groupTitle = {
  fontWeight: 800,
  marginBottom: 8,
};

const checkRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const checkBlock = {
  padding: "4px 0 8px",
};

const checkLabel = {
  fontWeight: 700,
  marginBottom: 4,
};

const actionRowWrap = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const actionRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 16,
};
