import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import MultiSelectDropdown from "../components/MultiSelectDropdown";

import {
  hasPermission,
  loadSession,
} from "../utils/auth";

const getId = (item) =>
  item?._id || item?.id;

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
        label:
          "Outward Adjustment",
        permissions: [
          "adjustment.manage",
        ],
      },
      {
        key: "settlement_access",
        label: "Settlement",
        permissions: [
          "settlement.view",
        ],
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
];

const ALL_PERMISSION_ITEMS =
  PERMISSION_GROUPS.flatMap(
    (group) => group.items
  );

const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
];

const getActionOptions = (
  groupKey,
  item
) => {

  return ACTIONS.map(
    (action) => {

      const direct =
        item.permissions.find(
          (permission) =>
            permission.endsWith(
              `.${action}`
            )
        );

      return {
        id: `${item.key}:${action}`,
        label:
          action[0].toUpperCase() +
          action.slice(1),
        permission:
          direct ||
          item.permissions[0] ||
          null,
      };

    }
  ).filter(
    (option, index, arr) =>
      option.permission &&
      arr.findIndex(
        (x) =>
          x.permission ===
          option.permission
      ) === index
  );

};

const ALL_ACTION_OPTIONS =
  PERMISSION_GROUPS.flatMap(
    (group) =>
      group.items.flatMap(
        (item) =>
          getActionOptions(
            group.key,
            item
          )
      )
  );

const flattenPermissionsFromToggles =
  (toggles) =>
    Array.from(
      new Set(
        ALL_ACTION_OPTIONS.flatMap(
          (option) =>
            toggles[option.id] &&
            option.permission
              ? [option.permission]
              : []
        )
      )
    );

const togglesFromPermissions =
  (permissions = []) => {

    const permissionSet =
      new Set(
        permissions || []
      );

    return ALL_ACTION_OPTIONS.reduce(
      (acc, option) => {

        acc[option.id] =
          !!option.permission &&
          permissionSet.has(
            option.permission
          );

        return acc;

      },
      {}
    );

  };

const createDefaultFormData =
  () => ({
    name: "",
    address: "",
    username: "",
    password: "",
    location_id: "",
    role: "",
    permissions: [
      "dashboard.view",
    ],
    opening_balance: "0",
    opening_balance_type:
      "dr",
    assigned_warehouse_ids:
      [],
  });

export default function EmployeeManagementPage() {

  const { user: currentUser } =
    loadSession();

  const isAdminUser =
    hasPermission(
      currentUser,
      "all"
    );

  const [employees, setEmployees] =
    useState([]);

  const [roles, setRoles] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [warehouses, setWarehouses] =
    useState([]);

  const [
    showEmployeeForm,
    setShowEmployeeForm,
  ] = useState(false);

  const [formData, setFormData] =
    useState(
      createDefaultFormData()
    );

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

  const fetchEmployees =
    async () => {

      const res =
        await axios.get(
          "/api/employees"
        );

      setEmployees(
        res.data || []
      );

    };

  const fetchRoles =
    async () => {

      const res =
        await axios.get(
          "/api/roles"
        );

      setRoles(
        res.data || []
      );

    };

  const fetchMeta =
    async () => {

      const [
        locationRes,
        warehouseRes,
      ] = await Promise.all([
        axios.get(
          "/api/locations"
        ),
        axios.get(
          "/api/warehouses"
        ),
      ]);

      setLocations(
        locationRes.data || []
      );

      setWarehouses(
        warehouseRes.data || []
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
        "Failed to load users"
      );

    });

  }, []);

  const warehouseOptions =
    useMemo(
      () =>
        warehouses.map(
          (item) => ({
            value: String(
              getId(item)
            ),
            label:
              item.location_name
                ? `${item.name} (${item.location_name})`
                : item.name,
          })
        ),
      [warehouses]
    );

  const handleEmployeeChange =
    (e) => {

      const {
        name,
        value,
      } = e.target;

      setFormData(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );

    };

  const handleEmployeeToggle =
    (key) => {

      setEmployeeToggles(
        (prev) => ({
          ...prev,
          [key]:
            !prev[key],
        })
      );

    };

  const resetEmployeeForm =
    () => {

      setFormData(
        createDefaultFormData()
      );

      setEmployeeToggles(
        togglesFromPermissions([
          "dashboard.view",
        ])
      );

      setEditId(null);

      setShowEmployeeForm(
        false
      );

    };

  const handleSubmitEmployee =
    async (e) => {

      e.preventDefault();

      const permissions =
        flattenPermissionsFromToggles(
          employeeToggles
        );

      const payload = {
        ...formData,
        role:
          formData.role ||
          "Custom Role",
        permissions,
        assigned_warehouse_ids:
          (
            formData.assigned_warehouse_ids ||
            []
          ).map(String),
      };

      if (
        !payload.name ||
        !payload.username ||
        (!editId &&
          !payload.password)
      ) {

        alert(
          "Name, username and password are required"
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

        await Promise.all([
          fetchEmployees(),
          fetchMeta(),
        ]);

        resetEmployeeForm();

      } catch (err) {

        console.error(err);

        alert(
          err.response?.data
            ?.error ||
            "Failed to save employee"
        );

      }

    };

  const handleEditEmployee =
    (employee) => {

      const assignedWarehouseIds =
        warehouses
          .filter(
            (item) =>
              String(
                item.employee_id
              ) ===
              String(
                getId(
                  employee
                )
              )
          )
          .map((item) =>
            String(
              getId(item)
            )
          );

      setFormData({
        name:
          employee.name ||
          "",

        address:
          employee.address ||
          "",

        username:
          employee.username ||
          "",

        password: "",

        location_id:
          employee.location_id ||
          "",

        role:
          employee.role ||
          "",

        permissions:
          employee.permissions ||
          [],

        opening_balance:
          String(
            employee.opening_balance ||
              0
          ),

        opening_balance_type:
          employee.opening_balance_type ||
          "dr",

        assigned_warehouse_ids:
          assignedWarehouseIds,
      });

      setEmployeeToggles(
        togglesFromPermissions(
          employee.permissions ||
            []
        )
      );

      setEditId(
        getId(employee)
      );

      setShowEmployeeForm(
        true
      );

    };

  const handleDeleteEmployee =
    async (id) => {

      if (
        !window.confirm(
          "Delete this employee?"
        )
      ) {
        return;
      }

      await axios.delete(
        `/api/employees/${id}`
      );

      await fetchEmployees();

    };

  return (

    <div style={pageStyle}>

      <div style={heroCard}>

        <div>

          <h2
            style={{
              margin: 0,
            }}
          >
            Users and Security
          </h2>

        </div>

        {isAdminUser ? (

          <button
            type="button"
            onClick={() =>
              setShowEmployeeForm(
                true
              )
            }
            style={
              primaryButton
            }
          >
            New User
          </button>

        ) : null}

      </div>

      <div style={tableCardStyle}>

        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
            fontSize: 13,
          }}
        >

          <thead>

            <tr
              style={{
                background:
                  "#0f766e",
                color: "#fff",
              }}
            >

              <th style={thStyle}>
                ID
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
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {employees.map(
              (
                employee,
                index
              ) => (

                <tr
                  key={getId(
                    employee
                  )}
                  style={{
                    background:
                      index %
                        2 ===
                      0
                        ? "#fff"
                        : "#f8fafc",
                  }}
                >

                  <td style={tdStyle}>
                    {String(
                      getId(
                        employee
                      )
                    ).slice(-6)}
                  </td>

                  <td style={tdStyle}>
                    {
                      employee.name
                    }
                  </td>

                  <td style={tdStyle}>
                    {
                      employee.username
                    }
                  </td>

                  <td style={tdStyle}>
                    {employee.role ||
                      "-"}
                  </td>

                  <td style={tdStyle}>
                    {locations.find(
                      (
                        item
                      ) =>
                        String(
                          getId(
                            item
                          )
                        ) ===
                        String(
                          employee.location_id
                        )
                    )?.name ||
                      "-"}
                  </td>

                  <td style={tdStyle}>

                    <button
                      type="button"
                      onClick={() =>
                        handleEditEmployee(
                          employee
                        )
                      }
                      style={
                        miniBlue
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteEmployee(
                          getId(
                            employee
                          )
                        )
                      }
                      style={
                        miniRed
                      }
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

      {showEmployeeForm ? (

        <div style={modalCard}>

          <form
            onSubmit={
              handleSubmitEmployee
            }
          >

            <div style={formGrid}>

              <Field label="Name">
                <input
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={
                    inputStyle
                  }
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
                  style={
                    inputStyle
                  }
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
                  style={
                    inputStyle
                  }
                />
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
                  style={
                    inputStyle
                  }
                >

                  <option value="">
                    Select Location
                  </option>

                  {locations.map(
                    (
                      location
                    ) => (

                      <option
                        key={getId(
                          location
                        )}
                        value={getId(
                          location
                        )}
                      >
                        {
                          location.name
                        }
                      </option>

                    )
                  )}

                </select>

              </Field>

              <div
                style={{
                  gridColumn:
                    "1 / -1",
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
                  onChange={(
                    next
                  ) =>
                    setFormData(
                      (
                        prev
                      ) => ({
                        ...prev,
                        assigned_warehouse_ids:
                          next,
                      })
                    )
                  }
                  placeholder="Select Warehouses"
                />

              </div>

            </div>

            <div
              style={
                securityCard
              }
            >

              {PERMISSION_GROUPS.map(
                (group) => (

                  <div
                    key={
                      group.key
                    }
                  >

                    <h4>
                      {
                        group.title
                      }
                    </h4>

                    {group.items.map(
                      (
                        item
                      ) => (

                        <div
                          key={
                            item.key
                          }
                        >

                          <strong>
                            {
                              item.label
                            }
                          </strong>

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
                                        option.id
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
                style={
                  dangerButton
                }
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      ) : null}

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
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  display: "flex",
  justifyContent:
    "space-between",
};

const tableCardStyle = {
  background: "#fff",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  overflowX: "auto",
};

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
};

const tdStyle = {
  padding: "10px 12px",
  borderTop:
    "1px solid #e2e8f0",
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

const modalCard = {
  marginTop: 16,
  background: "#f8fafc",
  borderRadius: 18,
  padding: 20,
  border:
    "1px solid #e2e8f0",
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
  border:
    "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing:
    "border-box",
};

const securityCard = {
  marginTop: 16,
  background: "#fff",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
};

const checkRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 0",
};

const actionRowWrap = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const actionRow = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: 12,
  marginTop: 16,
};
