import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { hasPermission, loadSession } from "../utils/auth";

const createDefaultFormData = () => ({
  name: "",
  address: "",
  username: "",
  password: "",
  location_id: "",
  role: "",
  permissions: [],
  opening_balance: "0",
  opening_balance_type: "dr",
  assigned_warehouse_ids: [],
});

export default function EmployeeManagementPage() {

  const { user: currentUser } =
    loadSession();

  const isAdminUser =
    hasPermission(currentUser, "all");

  const [employees, setEmployees] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [warehouses, setWarehouses] =
    useState([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editId, setEditId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState(createDefaultFormData());

  // =========================
  // FETCH
  // =========================

  const fetchEmployees =
    async () => {

      const res =
        await axios.get(
          "/api/employees"
        );

      setEmployees(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    };

  const fetchLocations =
    async () => {

      const res =
        await axios.get(
          "/api/locations"
        );

      setLocations(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    };

  const fetchWarehouses =
    async () => {

      const res =
        await axios.get(
          "/api/warehouses"
        );

      setWarehouses(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    };

  useEffect(() => {

    Promise.all([
      fetchEmployees(),
      fetchLocations(),
      fetchWarehouses(),
    ]).catch(console.error);

  }, []);

  // =========================
  // WAREHOUSE OPTIONS
  // =========================

  const warehouseOptions =
    useMemo(() => {

      return warehouses.map(
        (item) => ({
          value:
            String(
              item._id || item.id
            ),

          label:
            item.location_name
              ? `${item.name} (${item.location_name})`
              : item.name,
        })
      );

    }, [warehouses]);

  // =========================
  // INPUT CHANGE
  // =========================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (loading) return;

      if (
        !formData.name ||
        !formData.username
      ) {

        alert(
          "Name and Username required"
        );

        return;
      }

      if (
        !editId &&
        !formData.password
      ) {

        alert(
          "Password required"
        );

        return;
      }

      setLoading(true);

      try {

        const payload = {

          name:
            formData.name,

          address:
            formData.address,

          username:
            formData.username,

          password:
            formData.password,

          location_id:
            formData.location_id,

          role:
            formData.role || "staff",

          permissions:
            formData.permissions || [],

          opening_balance:
            Number(
              formData.opening_balance || 0
            ),

          opening_balance_type:
            formData.opening_balance_type,

          assigned_warehouse_ids:
            formData.assigned_warehouse_ids || [],
        };

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
          fetchWarehouses(),
        ]);

        resetForm();

      } catch (err) {

        console.error(err);

        alert(
          err.response?.data?.error ||
          "Failed to save employee"
        );

      } finally {

        setLoading(false);
      }
    };

  // =========================
  // EDIT
  // =========================

  const handleEdit =
    (employee) => {

      const assignedWarehouseIds =
        warehouses
          .filter(
            (item) =>
              String(
                item.employee_id
              ) ===
              String(
                employee._id ||
                employee.id
              )
          )
          .map(
            (item) =>
              String(
                item._id ||
                item.id
              )
          );

      setFormData({

        name:
          employee.name || "",

        address:
          employee.address || "",

        username:
          employee.username || "",

        password: "",

        location_id:
          String(
            employee.location_id?._id ||
            employee.location_id ||
            ""
          ),

        role:
          employee.role || "",

        permissions:
          employee.permissions || [],

        opening_balance:
          String(
            employee.opening_balance || 0
          ),

        opening_balance_type:
          employee.opening_balance_type || "dr",

        assigned_warehouse_ids:
          assignedWarehouseIds,
      });

      setEditId(
        employee._id ||
        employee.id
      );

      setShowForm(true);
    };

  // =========================
  // DELETE
  // =========================

  const handleDelete =
    async (id) => {

      if (
        !window.confirm(
          "Delete Employee?"
        )
      ) {
        return;
      }

      try {

        await axios.delete(
          `/api/employees/${id}`
        );

        await fetchEmployees();

      } catch (err) {

        console.error(err);

        alert(
          err.response?.data?.error ||
          "Delete failed"
        );
      }
    };

  // =========================
  // RESET
  // =========================

  const resetForm = () => {

    setFormData(
      createDefaultFormData()
    );

    setEditId(null);

    setShowForm(false);
  };

  return (
    <div style={{ padding: 20 }}>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: 20,
        }}
      >
        <h2>
          Employee Management
        </h2>

        {isAdminUser && (
          <button
            onClick={() =>
              setShowForm(true)
            }
          >
            Add Employee
          </button>
        )}
      </div>

      {/* ================= */}
      {/* TABLE */}
      {/* ================= */}

      <table
        border="1"
        cellPadding="10"
        width="100%"
      >

        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Location</th>
            <th>Warehouse</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {employees.map(
            (employee) => {

              const assignedNames =
                warehouses
                  .filter(
                    (item) =>
                      String(
                        item.employee_id
                      ) ===
                      String(
                        employee._id ||
                        employee.id
                      )
                  )
                  .map(
                    (item) =>
                      item.name
                  )
                  .join(", ");

              return (
                <tr
                  key={
                    employee._id ||
                    employee.id
                  }
                >
                  <td>
                    {employee.name}
                  </td>

                  <td>
                    {employee.username}
                  </td>

                  <td>
                    {
                      locations.find(
                        (item) =>
                          String(
                            item._id ||
                            item.id
                          ) ===
                          String(
                            employee.location_id?._id ||
                            employee.location_id
                          )
                      )?.name
                    }
                  </td>

                  <td>
                    {assignedNames || "-"}
                  </td>

                  <td>
                    {employee.role}
                  </td>

                  <td>

                    <button
                      onClick={() =>
                        handleEdit(
                          employee
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(
                          employee._id ||
                          employee.id
                        )
                      }
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

      {/* ================= */}
      {/* FORM */}
      {/* ================= */}

      {showForm && (

        <div
          style={{
            marginTop: 30,
            border:
              "1px solid #ccc",
            padding: 20,
          }}
        >

          <form
            onSubmit={handleSubmit}
          >

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 15,
              }}
            >

              <input
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
              />

              <input
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />

              <input
                name="role"
                placeholder="Role"
                value={formData.role}
                onChange={handleChange}
              />

              <select
                name="location_id"
                value={
                  formData.location_id
                }
                onChange={handleChange}
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

              <input
                name="opening_balance"
                placeholder="Opening Balance"
                value={
                  formData.opening_balance
                }
                onChange={handleChange}
              />

              <select
                name="opening_balance_type"
                value={
                  formData.opening_balance_type
                }
                onChange={handleChange}
              >
                <option value="dr">
                  DR
                </option>

                <option value="cr">
                  CR
                </option>
              </select>

            </div>

            <br />

            <textarea
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              style={{
                width: "100%",
              }}
            />

            <br />
            <br />

            <MultiSelectDropdown
              label="Assign Warehouses"
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
            />

            <br />

            <button
              type="submit"
            >
              {loading
                ? "Saving..."
                : editId
                ? "Update Employee"
                : "Create Employee"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              style={{
                marginLeft: 10,
              }}
            >
              Cancel
            </button>

          </form>

        </div>
      )}
    </div>
  );
}
