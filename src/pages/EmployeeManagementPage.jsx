import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

/* =========================
   PERMISSIONS
========================= */

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
      {
        key: "transport_access",
        label: "Transport",
        permissions: ["transport.manage"],
      },
    ],
  },

  {
    key: "reports",
    title: "Reports",
    items: [
      {
        key: "report_inward",
        label: "Inward Report",
        permissions: ["report.inward"],
      },
      {
        key: "report_erp",
        label: "ERP Report",
        permissions: ["report.erp"],
      },
      {
        key: "report_party_ledger",
        label: "Party Ledger",
        permissions: ["report.partyLedger"],
      },
      {
        key: "report_expense",
        label: "Expense Report",
        permissions: ["report.expense"],
      },
      {
        key: "report_cash",
        label: "Cash Report",
        permissions: ["report.cash"],
      },
    ],
  },

  {
    key: "masters",
    title: "Masters & Admin",
    items: [
      {
        key: "employees_manage",
        label: "Employees",
        permissions: ["employees.view"],
      },
      {
        key: "locations_manage",
        label: "Locations",
        permissions: ["locations.manage"],
      },
      {
        key: "warehouses_manage",
        label: "Warehouses",
        permissions: ["warehouses.manage"],
      },
      {
        key: "companies_manage",
        label: "Companies",
        permissions: ["companies.manage"],
      },
      {
        key: "products_manage",
        label: "Products",
        permissions: ["products.manage"],
      },
      {
        key: "dashboard_view",
        label: "Dashboard",
        permissions: ["dashboard.view"],
      },
    ],
  },
];

const ACTIONS = ["view", "create", "edit", "delete"];

const getActionOptions = (groupKey, item) => {
  if (groupKey === "operations") {
    const options = ACTIONS.map((action) => {
      const direct = item.permissions.find((p) =>
        p.endsWith(`.${action}`)
      );

      return {
        id: `${item.key}:${action}`,
        label: action.toUpperCase(),
        permission: direct || null,
      };
    }).filter((x) => x.permission);

    if (options.length) return options;
  }

  return [
    {
      id: `${item.key}:access`,
      label: "ACCESS",
      permission: item.permissions[0],
    },
  ];
};

const ALL_ACTION_OPTIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.items.flatMap((item) =>
    getActionOptions(group.key, item)
  )
);

const togglesFromPermissions = (permissions = []) => {
  const permissionSet = new Set(permissions);

  return ALL_ACTION_OPTIONS.reduce((acc, option) => {
    acc[option.id] = permissionSet.has(option.permission);
    return acc;
  }, {});
};

const flattenPermissions = (toggles) => {
  return Array.from(
    new Set(
      ALL_ACTION_OPTIONS.flatMap((option) =>
        toggles[option.id] ? [option.permission] : []
      )
    )
  );
};

/* =========================
   DEFAULT FORMS
========================= */

const createEmployeeForm = () => ({
  name: "",
  username: "",
  password: "",
  address: "",
  location_id: "",
  role_id: "",
  opening_balance: "0",
  opening_balance_type: "dr",
  assigned_warehouse_ids: [],
});

const createRoleForm = () => ({
  name: "",
  is_admin: false,
  toggles: togglesFromPermissions(["dashboard.view"]),
});

/* =========================
   MAIN COMPONENT
========================= */

export default function EmployeeManagementPage() {
  const { user: currentUser } = loadSession();

  const isAdminUser = hasPermission(currentUser, "all");

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showEmployeeForm, setShowEmployeeForm] =
    useState(false);

  const [showRoleModal, setShowRoleModal] =
    useState(false);

  const [showRoleEditor, setShowRoleEditor] =
    useState(false);

  const [employeeForm, setEmployeeForm] =
    useState(createEmployeeForm());

  const [roleForm, setRoleForm] =
    useState(createRoleForm());

  const [employeePermissions, setEmployeePermissions] =
    useState(
      togglesFromPermissions(["dashboard.view"])
    );

  const [editEmployeeId, setEditEmployeeId] =
    useState(null);

  const [editRoleId, setEditRoleId] =
    useState(null);

  /* =========================
     LOAD DATA
  ========================= */

  const fetchEmployees = async () => {
    const res = await axios.get("/api/employees");
    setEmployees(res.data || []);
  };

  const fetchRoles = async () => {
    const res = await axios.get("/api/roles");
    setRoles(res.data || []);
  };

  const fetchMeta = async () => {
    const [locationRes, warehouseRes] =
      await Promise.all([
        axios.get("/api/locations"),
        axios.get("/api/warehouses"),
      ]);

    setLocations(locationRes.data || []);
    setWarehouses(warehouseRes.data || []);
  };

  useEffect(() => {
    Promise.all([
      fetchEmployees(),
      fetchRoles(),
      fetchMeta(),
    ]).catch(console.error);
  }, []);

  /* =========================
     OPTIONS
  ========================= */

  const warehouseOptions = useMemo(() => {
    return warehouses.map((item) => ({
      value: String(item.id),
      label: item.name,
    }));
  }, [warehouses]);

  /* =========================
     EMPLOYEE FORM
  ========================= */

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;

    if (name === "role_id") {
      const selectedRole = roles.find(
        (x) => String(x.id) === String(value)
      );

      if (selectedRole) {
        const perms = selectedRole.is_admin
          ? ALL_ACTION_OPTIONS.map(
              (x) => x.permission
            )
          : selectedRole.permissions || [];

        setEmployeePermissions(
          togglesFromPermissions(perms)
        );
      }

      setEmployeeForm((prev) => ({
        ...prev,
        role_id: value,
      }));

      return;
    }

    setEmployeeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmployeeToggle = (key) => {
    setEmployeePermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveEmployee = async (e) => {
    e.preventDefault();

    const selectedRole = roles.find(
      (x) =>
        String(x.id) ===
        String(employeeForm.role_id)
    );

    const permissions = selectedRole?.is_admin
      ? ["all"]
      : flattenPermissions(employeePermissions);

    const payload = {
      ...employeeForm,
      permissions,
      role: selectedRole?.name || "",
      assigned_warehouse_ids:
        employeeForm.assigned_warehouse_ids.map(
          Number
        ),
    };

    try {
      if (editEmployeeId) {
        await axios.put(
          `/api/employees/${editEmployeeId}`,
          payload
        );
      } else {
        await axios.post(
          "/api/employees",
          payload
        );
      }

      await fetchEmployees();

      setShowEmployeeForm(false);
      setEditEmployeeId(null);
      setEmployeeForm(createEmployeeForm());

      setEmployeePermissions(
        togglesFromPermissions([
          "dashboard.view",
        ])
      );
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          "Failed to save employee"
      );
    }
  };

  const editEmployee = (employee) => {
    setEditEmployeeId(employee.id);

    setEmployeeForm({
      name: employee.name || "",
      username: employee.username || "",
      password: "",
      address: employee.address || "",
      location_id:
        employee.location_id || "",
      role_id: employee.role_id || "",
      opening_balance: String(
        employee.opening_balance || 0
      ),
      opening_balance_type:
        employee.opening_balance_type ||
        "dr",
      assigned_warehouse_ids: [],
    });

    setEmployeePermissions(
      togglesFromPermissions(
        employee.permissions || []
      )
    );

    setShowEmployeeForm(true);
  };

  const deleteEmployee = async (id) => {
    if (!window.confirm("Delete employee?"))
      return;

    await axios.delete(
      `/api/employees/${id}`
    );

    fetchEmployees();
  };

  /* =========================
     ROLE SECTION
  ========================= */

  const handleRoleToggle = (key) => {
    setRoleForm((prev) => ({
      ...prev,
      toggles: {
        ...prev.toggles,
        [key]: !prev.toggles[key],
      },
    }));
  };

  const saveRole = async (e) => {
    e.preventDefault();

    const permissions = roleForm.is_admin
      ? ["all"]
      : flattenPermissions(roleForm.toggles);

    const payload = {
      name: roleForm.name,
      permissions,
      is_admin: roleForm.is_admin,
    };

    try {
      if (editRoleId) {
        await axios.put(
          `/api/roles/${editRoleId}`,
          payload
        );
      } else {
        await axios.post(
          "/api/roles",
          payload
        );
      }

      fetchRoles();

      setRoleForm(createRoleForm());
      setEditRoleId(null);
      setShowRoleEditor(false);
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          "Failed to save role"
      );
    }
  };

  const editRole = (role) => {
    setEditRoleId(role.id);

    setRoleForm({
      name: role.name || "",
      is_admin: role.is_admin || false,
      toggles: togglesFromPermissions(
        role.permissions || []
      ),
    });

    setShowRoleEditor(true);
  };

  const deleteRole = async (id) => {
    if (!window.confirm("Delete role?"))
      return;

    await axios.delete(`/api/roles/${id}`);

    fetchRoles();
  };

  /* =========================
     UI
  ========================= */

  return (
    <div style={pageStyle}>
      <div style={heroCard}>
        <div>
          <h2>User Management</h2>
          <p>
            Create employee and assign role
            based access.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          <button
            style={primaryButton}
            onClick={() =>
              setShowEmployeeForm(true)
            }
          >
            New Employee
          </button>

          {isAdminUser && (
            <button
              style={secondaryButton}
              onClick={() =>
                setShowRoleModal(true)
              }
            >
              Manage Roles
            </button>
          )}
        </div>
      </div>

      {/* =======================
          EMPLOYEE TABLE
      ======================== */}

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
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Permissions</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
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
                  {Array.isArray(
                    employee.permissions
                  )
                    ? employee.permissions.join(
                        ", "
                      )
                    : "-"}
                </td>

                <td style={tdStyle}>
                  <button
                    style={miniBlue}
                    onClick={() =>
                      editEmployee(employee)
                    }
                  >
                    Edit
                  </button>

                  <button
                    style={miniRed}
                    onClick={() =>
                      deleteEmployee(employee.id)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* =======================
          EMPLOYEE FORM
      ======================== */}

      {showEmployeeForm && (
        <Modal
          title={
            editEmployeeId
              ? "Edit Employee"
              : "Create Employee"
          }
          onClose={() =>
            setShowEmployeeForm(false)
          }
        >
          <form onSubmit={saveEmployee}>
            <div style={formGrid}>
              <Field label="Name">
                <input
                  name="name"
                  value={employeeForm.name}
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
                    employeeForm.username
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
                    employeeForm.password
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Role">
                <select
                  name="role_id"
                  value={
                    employeeForm.role_id
                  }
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
                      key={role.id}
                      value={role.id}
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
                    employeeForm.location_id
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
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Warehouse">
                <MultiSelectDropdown
                  label=""
                  options={
                    warehouseOptions
                  }
                  value={
                    employeeForm.assigned_warehouse_ids
                  }
                  onChange={(next) =>
                    setEmployeeForm(
                      (prev) => ({
                        ...prev,
                        assigned_warehouse_ids:
                          next,
                      })
                    )
                  }
                />
              </Field>
            </div>

            {/* ROLE BASED ACCESS */}

            <div style={securityCard}>
              <div style={groupTitle}>
                Role Permissions
              </div>

              <div style={groupGrid}>
                {PERMISSION_GROUPS.map(
                  (group) => (
                    <div
                      key={group.key}
                      style={groupCard}
                    >
                      <div
                        style={
                          groupTitle
                        }
                      >
                        {group.title}
                      </div>

                      {group.items.map(
                        (item) => (
                          <div
                            key={item.key}
                            style={
                              checkBlock
                            }
                          >
                            <div
                              style={
                                checkLabel
                              }
                            >
                              {
                                item.label
                              }
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
                                        !!employeePermissions[
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
                Save Employee
              </button>

              <button
                type="button"
                style={dangerButton}
                onClick={() =>
                  setShowEmployeeForm(
                    false
                  )
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =======================
          ROLE MODAL
      ======================== */}

      {showRoleModal && (
        <Modal
          title="Role Management"
          onClose={() =>
            setShowRoleModal(false)
          }
        >
          <div
            style={{
              marginBottom: 20,
            }}
          >
            <button
              style={primaryButton}
              onClick={() =>
                setShowRoleEditor(true)
              }
            >
              Create Role
            </button>
          </div>

          <div style={tableCardStyle}>
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>
                    Role
                  </th>

                  <th style={thStyle}>
                    Permissions
                  </th>

                  <th style={thStyle}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td style={tdStyle}>
                      {role.name}
                    </td>

                    <td style={tdStyle}>
                      {role.permissions?.join(
                        ", "
                      )}
                    </td>

                    <td style={tdStyle}>
                      <button
                        style={
                          miniBlue
                        }
                        onClick={() =>
                          editRole(
                            role
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        style={
                          miniRed
                        }
                        onClick={() =>
                          deleteRole(
                            role.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ROLE FORM */}

          {showRoleEditor && (
            <div
              style={{
                ...securityCard,
                marginTop: 20,
              }}
            >
              <form onSubmit={saveRole}>
                <div style={formGrid}>
                  <Field label="Role Name">
                    <input
                      value={
                        roleForm.name
                      }
                      onChange={(
                        e
                      ) =>
                        setRoleForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            name: e
                              .target
                              .value,
                          })
                        )
                      }
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <label
                    style={
                      checkRow
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        roleForm.is_admin
                      }
                      onChange={(
                        e
                      ) =>
                        setRoleForm(
                          (
                            prev
                          ) => ({
                            ...prev,
                            is_admin:
                              e
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    <span>
                      Admin Role
                    </span>
                  </label>
                </div>

                {!roleForm.is_admin && (
                  <div
                    style={
                      groupGrid
                    }
                  >
                    {PERMISSION_GROUPS.map(
                      (
                        group
                      ) => (
                        <div
                          key={
                            group.key
                          }
                          style={
                            groupCard
                          }
                        >
                          <div
                            style={
                              groupTitle
                            }
                          >
                            {
                              group.title
                            }
                          </div>

                          {group.items.map(
                            (
                              item
                            ) => (
                              <div
                                key={
                                  item.key
                                }
                                style={
                                  checkBlock
                                }
                              >
                                <div
                                  style={
                                    checkLabel
                                  }
                                >
                                  {
                                    item.label
                                  }
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
                                            !!roleForm
                                              .toggles[
                                              option
                                                .id
                                            ]
                                          }
                                          onChange={() =>
                                            handleRoleToggle(
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
                )}

                <div style={actionRow}>
                  <button
                    type="submit"
                    style={
                      primaryButton
                    }
                  >
                    Save Role
                  </button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div style={inlineCardWrap}>
      <div style={modalCard}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            marginBottom: 20,
          }}
        >
          <h2>{title}</h2>

          <button
            style={secondaryButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <div
        style={{
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

/* =========================
   STYLES
========================= */

const pageStyle = {
  padding: 20,
  fontFamily: "Arial",
};

const heroCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  display: "flex",
  justifyContent:
    "space-between",
};

const tableCardStyle = {
  background: "#fff",
  borderRadius: 16,
  overflowX: "auto",
};

const thStyle = {
  padding: 12,
  textAlign: "left",
};

const tdStyle = {
  padding: 12,
  borderTop:
    "1px solid #e2e8f0",
};

const primaryButton = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

const secondaryButton = {
  border: "none",
  background: "#334155",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

const dangerButton = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

const miniBlue = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 6,
  marginRight: 8,
  cursor: "pointer",
};

const miniRed = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
};

const inlineCardWrap = {
  marginTop: 20,
};

const modalCard = {
  background: "#f8fafc",
  padding: 20,
  borderRadius: 16,
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
  border:
    "1px solid #cbd5e1",
  borderRadius: 8,
};

const securityCard = {
  marginTop: 20,
  background: "#fff",
  padding: 16,
  borderRadius: 16,
};

const groupGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
};

const groupCard = {
  border:
    "1px solid #dbe4ea",
  borderRadius: 12,
  padding: 14,
};

const groupTitle = {
  fontWeight: 700,
  marginBottom: 10,
};

const checkRow = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginBottom: 6,
};

const checkBlock = {
  marginBottom: 12,
};

const checkLabel = {
  fontWeight: 600,
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
  marginTop: 20,
};
