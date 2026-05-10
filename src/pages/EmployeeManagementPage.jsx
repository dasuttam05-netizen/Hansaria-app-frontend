import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

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

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showEmployeeForm, setShowEmployeeForm] =
    useState(false);

  const [formData, setFormData] = useState(
    createDefaultFormData()
  );

  const [editId, setEditId] = useState(null);

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
    ]).catch((err) => {
      console.error(err);
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

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: String(role.id || role._id),
        label: role.name,
      })),
    [roles]
  );

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;

    if (name === "role") {
      const selectedRole = roles.find(
        (item) =>
          String(item.id || item._id) ===
          String(value)
      );

      setFormData((prev) => ({
        ...prev,
        role: selectedRole?.name || "",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetEmployeeForm = () => {
    setFormData(createDefaultFormData());
    setEditId(null);
    setShowEmployeeForm(false);
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      assigned_warehouse_ids:
        formData.assigned_warehouse_ids || [],
    };

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
    }
  };

  const handleEditEmployee = (employee) => {
    setFormData({
      employee_id: employee.employee_id || "",
      name: employee.name || "",
      address: employee.address || "",
      username: employee.username || "",
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
        employee.opening_balance_type || "dr",
      assigned_warehouse_ids:
        employee.assigned_warehouse_ids || [],
    });

    setEditId(
      String(employee.id || employee._id)
    );

    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (id) => {
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

      {/* Header */}
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

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
            }}
          >
            Employee management
          </p>
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

      {/* Table */}
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
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {employees.map(
              (employee, index) => (
                <tr
                  key={String(
                    employee.id ||
                      employee._id
                  )}
                  style={{
                    background:
                      index % 2 === 0
                        ? "#fff"
                        : "#f8fafc",
                  }}
                >
                  <td style={tdStyle}>
                    {
                      employee.employee_id ||
                      "-"
                    }
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
                      )?.name || "-"
                    }
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
                            employee.id ||
                              employee._id
                          )
                        )
                      }
                      style={miniRed}
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

      {/* Form */}
      {showEmployeeForm ? (
        <div style={modalCard}>
          <form
            onSubmit={
              handleSubmitEmployee
            }
          >
            <div style={formGrid}>

              {/* Employee Code */}
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

              {/* Name */}
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

              {/* Username */}
              <Field label="Username">
                <input
                  name="username"
                  value={formData.username}
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              {/* Password */}
              <Field label="Password">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                />
              </Field>

              {/* Role */}
              <Field label="Role">
                <select
                  name="role"
                  value={
                    roleOptions.find(
                      (item) =>
                        item.label ===
                        formData.role
                    )?.value || ""
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Custom
                  </option>

                  {roles.map((role) => (
                    <option
                      key={
                        role.id ||
                        role._id
                      }
                      value={
                        role.id ||
                        role._id
                      }
                    >
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Location */}
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

              {/* Opening Balance */}
              <Field label="Opening Balance">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 90px",
                    gap: 10,
                  }}
                >
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
                </div>
              </Field>

              {/* Address */}
              <div
                style={{
                  gridColumn:
                    "1 / -1",
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
                    rows={2}
                    style={{
                      ...inputStyle,
                      minHeight: 80,
                    }}
                  />
                </Field>
              </div>

              {/* Warehouse */}
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
                  onChange={(next) =>
                    setFormData(
                      (prev) => ({
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

            <div style={actionRow}>
              <button
                type="submit"
                style={primaryButton}
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
  display: "flex",
  justifyContent:
    "space-between",
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
  marginTop: 20,
  background: "#fff",
  borderRadius: 18,
  padding: 20,
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

const actionRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 16,
};
