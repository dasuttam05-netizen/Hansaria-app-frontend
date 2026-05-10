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
  const options = ACTIONS.map((action) => {
    const direct = item.permissions.find((permission) =>
      permission.endsWith(`.${action}`)
    );

    return {
      id: `${item.key}:${action}`,
      label: action[0].toUpperCase() + action.slice(1),
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
};

const ALL_ACTION_OPTIONS =
  PERMISSION_GROUPS.flatMap((group) =>
    group.items.flatMap((item) =>
      getActionOptions(group.key, item)
    )
  );

const flattenPermissionsFromToggles = (
  toggles
) =>
  Array.from(
    new Set(
      ALL_ACTION_OPTIONS.flatMap((option) =>
        toggles[option.id] &&
        option.permission
          ? [option.permission]
          : []
      )
    )
  );

const togglesFromPermissions = (
  permissions = []
) => {
  const permissionSet = new Set(
    permissions || []
  );

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

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];

  return arr.map(normalizeData);
};

export default function EmployeeManagementPage() {
  const { user: currentUser } =
    loadSession();

  const isAdminUser = hasPermission(
    currentUser,
    "all"
  );

  const [employees, setEmployees] =
    useState([]);

  const [roles, setRoles] = useState([]);

  const [locations, setLocations] =
    useState([]);

  const [warehouses, setWarehouses] =
    useState([]);

  const [
    showEmployeeForm,
    setShowEmployeeForm,
  ] = useState(false);

  const [formData, setFormData] =
    useState(createDefaultFormData());

  const [
    employeeToggles,
    setEmployeeToggles,
  ] = useState(
    togglesFromPermissions([
      "dashboard.view",
    ])
  );

  const [editId, setEditId] =
    useState(null);

  const [
    isSubmittingEmployee,
    setIsSubmittingEmployee,
  ] = useState(false);

  const fetchEmployees = async () => {
    const res = await axios.get(
      "/api/employees"
    );

    setEmployees(
      normalizeArray(res.data || [])
    );
  };

  const fetchRoles = async () => {
    const res = await axios.get(
      "/api/roles"
    );

    setRoles(
      normalizeArray(res.data || [])
    );
  };

  const fetchMeta = async () => {
    const [locationRes, warehouseRes] =
      await Promise.all([
        axios.get("/api/locations"),
        axios.get("/api/warehouses"),
      ]);

    setLocations(
      normalizeArray(locationRes.data || [])
    );

    setWarehouses(
      normalizeArray(warehouseRes.data || [])
    );
  };

  useEffect(() => {
    Promise.all([
      fetchEmployees(),
      fetchRoles(),
      fetchMeta(),
    ]).catch((err) => {
      console.error(err);
      alert(
        "Failed to load users and security data"
      );
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

  const permissionSummary = useMemo(() => {
    const selected =
      flattenPermissionsFromToggles(
        employeeToggles
      );

    return selected.length
      ? selected.join(", ")
      : "No access selected";
  }, [employeeToggles]);

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

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmployeeToggle = (
    key
  ) => {
    setEmployeeToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmitEmployee =
    async (e) => {
      e.preventDefault();

      if (isSubmittingEmployee)
        return;

      const permissions =
        flattenPermissionsFromToggles(
          employeeToggles
        );

      const payload = {
        ...formData,
        permissions,
      };

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

        await fetchEmployees();

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

  const handleEditEmployee = (
    employee
  ) => {
    const recordId =
      employeeRecordId(employee);

    const assignedWarehouseIds =
      warehouses
        .filter(
          (item) =>
            String(item.employee_id) ===
            String(recordId)
        )
        .map((item) =>
          String(item._id || item.id)
        );

    setFormData({
      employee_id:
        employee.employee_id || "",
      name: employee.name || "",
      address: employee.address || "",
      username:
        employee.username || "",
      password: "",
      location_id: String(
        employee.location_id || ""
      ),
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

    setEditId(String(recordId));

    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee =
    async (id) => {
      if (
        !window.confirm(
          "Delete this employee?"
        )
      )
        return;

      try {
        await axios.delete(
          `/api/employees/${id}`
        );

        await fetchEmployees();
      } catch (err) {
        console.error(err);

        alert(
          err.response?.data?.error ||
            "Failed to delete employee"
        );
      }
    };

  return (
    <div style={pageStyle}>
      <div style={heroCard}>
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
            }}
          >
            Users and Security
          </h2>
        </div>

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

      <div style={tableCardStyle}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#0f766e",
                color: "#fff",
              }}
            >
              <th style={thStyle}>
                Emp.code
              </th>

              <th style={thStyle}>
                Name
              </th>

              <th style={thStyle}>
                Username
              </th>

              <th style={thStyle}>
                Role
              </th>

              <th style={thStyle}>
                Location
              </th>

              <th style={thStyle}>
                Warehouse
              </th>

              <th style={thStyle}>
                Access
              </th>

              <th style={thStyle}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {employees.map(
              (employee, index) => {
                const assignedNames =
                  warehouses
                    .filter(
                      (item) =>
                        String(
                          item.employee_id
                        ) ===
                        String(
                          employee.id ||
                            employee._id
                        )
                    )
                    .map(
                      (item) => item.name
                    )
                    .join(", ");

                return (
                  <tr
                    key={String(
                      employeeRecordId(
                        employee
                      )
                    )}
                    style={{
                      background:
                        index % 2 === 0
                          ? "#fff"
                          : "#f8fafc",
                    }}
                  >
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {employee.employee_id ||
                          "-"}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      {employee.name}
                    </td>

                    <td style={tdStyle}>
                      {employee.username}
                    </td>

                    <td style={tdStyle}>
                      {employee.role ||
                        "-"}
                    </td>

                    <td style={tdStyle}>
                      {
                        locations.find(
                          (item) =>
                            String(
                              item._id ||
                                item.id
                            ) ===
                            String(
                              employee.location_id
                            )
                        )?.name
                      }
                    </td>

                    <td style={tdStyle}>
                      {assignedNames ||
                        "-"}
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
                        type="button"
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
                        type="button"
                        onClick={() =>
                          handleDeleteEmployee(
                            String(
                              employeeRecordId(
                                employee
                              )
                            )
                          )
                        }
                        style={miniRed}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {showEmployeeForm ? (
        <Modal
          onClose={resetEmployeeForm}
          title={
            editId
              ? "Edit User"
              : "Create User"
          }
        >
          <form
            onSubmit={
              handleSubmitEmployee
            }
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
            </div>

            <div style={securityCard}>
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Access Control List
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {permissionSummary}
              </div>

              <div style={groupGrid}>
                {PERMISSION_GROUPS.map(
                  (group) => (
                    <div
                      key={group.key}
                      style={groupCard}
                    >
                      <div
                        style={groupTitle}
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
                style={
                  primaryButton
                }
              >
                Save User
              </button>

              <button
                type="button"
                onClick={
                  resetEmployeeForm
                }
                style={dangerButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div style={inlineCardWrap}>
      <div style={modalCard}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#0f172a",
            }}
          >
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={secondaryButton}
          >
            Back
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
          fontSize: 12,
          fontWeight: 700,
          color: "#475569",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      {children}
    </div>
  );
}

const pageStyle = {
  padding: 14,
  fontFamily:
    "Segoe UI, Arial, sans-serif",
};

const heroCard = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  boxShadow:
    "0 10px 24px rgba(15,23,42,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const tableCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  overflowX: "auto",
  boxShadow:
    "0 10px 24px rgba(15,23,42,0.08)",
};

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  borderTop: "1px solid #e2e8f0",
  verticalAlign: "top",
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

const secondaryButton = {
  border: "none",
  background: "#1e293b",
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
  cursor: "pointer",
};

const miniRed = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
};

const inlineCardWrap = {
  marginTop: 16,
};

const modalCard = {
  width: "100%",
  maxWidth: 1180,
  overflowY: "auto",
  background: "#f8fafc",
  borderRadius: 18,
  padding: 20,
  boxShadow:
    "0 10px 24px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
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
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const groupCard = {
  border: "1px solid #dbe4ea",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};

const groupTitle = {
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 8,
  fontSize: 14,
};

const checkRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 0",
  fontSize: 13,
  color: "#334155",
};

const checkBlock = {
  padding: "4px 0 8px",
};

const checkLabel = {
  fontWeight: 700,
  color: "#0f172a",
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
  flexWrap: "wrap",
};
