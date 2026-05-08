import React, { useState, useEffect } from "react";
import axios from "axios";

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location_id: "",
    employee_id: "",
  });
  const [editId, setEditId] = useState(null);

  const API_URL = "/api/warehouses";
  const LOC_API = "/api/locations";
  const EMP_API = "/api/employees";

  // 🔹 Fetch Warehouses
  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(API_URL);
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch warehouses");
    }
  };

  // 🔹 Fetch Locations & Employees
  const fetchLocations = async () => {
    try {
      const res = await axios.get(LOC_API);
      setLocations(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch locations");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(EMP_API);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch employees");
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchLocations();
    fetchEmployees();
  }, []);

  // 🔹 Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Save Warehouse
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      alert("Name and Address are required");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Warehouse updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Warehouse added successfully");
      }
      setFormData({ name: "", address: "", location_id: "", employee_id: "" });
      setEditId(null);
      setShowForm(false);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
      alert("Error saving warehouse");
    }
  };

  // 🔹 Edit Warehouse
  const handleEdit = (w) => {
    setFormData({
      name: w.name,
      address: w.address,
      location_id: w.location_id || "",
      employee_id: w.employee_id || "",
    });
    setEditId(w.id);
    setShowForm(true);
  };

  // 🔹 Delete Warehouse
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
      alert("Error deleting warehouse");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
        Warehouse Management
      </h2>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "#4caf50",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        >
          ➕ Add Warehouse
        </button>
      )}

      {/* 🔹 Popup Form */}
      {showForm && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backdropFilter: "blur(6px)",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 999,
            }}
            onClick={() => setShowForm(false)}
          ></div>

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              padding: "18px",
              borderRadius: "14px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
              width: "400px",
              maxWidth: "95%",
              zIndex: 1000,
              transition: "all 0.3s ease",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                marginBottom: "12px",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {editId ? "Edit Warehouse" : "New Warehouse"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Warehouse Name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                />
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                >
                  <option value="">-- Select Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                >
                  <option value="">-- Assign Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="submit"
                  style={{
                    background: "#4caf50",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✅ Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: "", address: "", location_id: "", employee_id: "" });
                    setEditId(null);
                  }}
                  style={{
                    background: "#f44336",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 🔹 Warehouses Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          marginTop: "15px",
        }}
      >
        <thead>
          <tr style={{ background: "#607d8b", color: "#fff", height: "32px" }}>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>ID</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Name</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Address</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Location</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Employee</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((w) => (
            <tr key={w.id} style={{ textAlign: "center", height: "28px" }}>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>{w.id}</td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>{w.name}</td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>{w.address}</td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>{w.location_name || "-"}</td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>{w.employee_name || "-"}</td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                <button
                  onClick={() => handleEdit(w)}
                  style={{
                    background: "#2196f3",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    marginRight: "4px",
                    fontSize: "12px",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(w.id)}
                  style={{
                    background: "#f44336",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {warehouses.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: "8px", textAlign: "center" }}>
                No warehouses found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
