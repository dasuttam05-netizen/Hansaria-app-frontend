import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";

const emptyForm = () => ({
  name: "",
  address: "",
  location_id: "",
  employee_id: "",
  employee_ids: [],
});

export default function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const API_URL = "/api/warehouses";

  const fetchAll = async () => {
    try {
      const [wRes, lRes, eRes] = await Promise.all([
        axios.get("/api/warehouses"),
        axios.get("/api/locations"),
        axios.get("/api/employees"),
      ]);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
      setLocations(Array.isArray(lRes.data) ? lRes.data : []);
      setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch warehouse data");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      alert("Name and Address are required");
      return;
    }
    try {
      const safeEmployeeIds = Array.isArray(formData.employee_ids)
        ? Array.from(new Set(formData.employee_ids.map((id) => String(id || "").trim()).filter(Boolean)))
        : [];
      const payload = {
        name: formData.name,
        address: formData.address,
        location_id: formData.location_id || null,
        employee_id: safeEmployeeIds[0] || null,
        employee_ids: safeEmployeeIds,
      };
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, payload);
        alert("Warehouse updated successfully");
      } else {
        await axios.post(API_URL, payload);
        alert("Warehouse added successfully");
      }
      resetForm();
      fetchAll();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving warehouse");
    }
  };

  const handleEdit = (w) => {
    const safeEmployeeIds = Array.isArray(w.employee_ids)
      ? w.employee_ids.map((id) => String(id))
      : w.employee_id
      ? [String(w.employee_id)]
      : [];
    setFormData({
      name: w.name || "",
      address: w.address || "",
      location_id: w.location_id ? String(w.location_id) : "",
      employee_id: safeEmployeeIds[0] || "",
      employee_ids: safeEmployeeIds,
    });
    setEditId(w.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting warehouse");
    }
  };

  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => {
        const empId = String(emp._id || emp.id);
        return { value: empId, label: emp.name || emp.username || `Employee ${empId}` };
      }),
    [employees]
  );

  const filteredEmployeeOptions = useMemo(() => {
    if (!formData.location_id) return employeeOptions;
    return employeeOptions.filter((option) => {
      const emp = employees.find((e) => String(e._id || e.id) === String(option.value));
      if (!emp) return false;
      const primaryLocation = emp.location_id ? String(emp.location_id) : "";
      const multiLocations = Array.isArray(emp.location_ids) ? emp.location_ids.map((id) => String(id)) : [];
      return primaryLocation === String(formData.location_id) || multiLocations.includes(String(formData.location_id));
    });
  }, [employeeOptions, employees, formData.location_id]);

  useEffect(() => {
    if (!formData.location_id) return;
    const allowed = new Set(filteredEmployeeOptions.map((item) => String(item.value)));
    setFormData((prev) => {
      const nextIds = Array.isArray(prev.employee_ids)
        ? prev.employee_ids.filter((id) => allowed.has(String(id)))
        : [];
      return {
        ...prev,
        employee_ids: nextIds,
        employee_id: nextIds[0] || "",
      };
    });
  }, [formData.location_id, filteredEmployeeOptions]);

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>{editId ? "Edit Warehouse" : "Add Warehouse"}</h2>
            <button type="button" onClick={resetForm} style={btnPrimary}>Back To Warehouse List</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <Field label="Warehouse Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Warehouse Name *" style={inp} />
              </Field>
              <Field label="Location">
                <select name="location_id" value={formData.location_id} onChange={handleChange} style={inp}>
                  <option value="">Select Location</option>
                  {locations.map((loc) => {
                    const locId = loc._id || loc.id;
                    return (
                      <option key={locId} value={String(locId)}>{loc.name}</option>
                    );
                  })}
                </select>
              </Field>
              <Field label="Assign Employee">
                <MultiSelectDropdown
                  label=""
                  options={filteredEmployeeOptions}
                  value={formData.employee_ids}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      employee_ids: next,
                      employee_id: next[0] || "",
                    }))
                  }
                  placeholder={formData.location_id ? "Select Employees" : "Select Location First (Optional)"}
                />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} style={{ ...inp, minHeight: 72, resize: "vertical" }} />
                </Field>
              </div>
            </div>
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>Save</button>
              <button type="button" onClick={resetForm} style={btnPrimary}>Back To Warehouse List</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: 10, flexWrap: "wrap" }}>
            <h2 style={titleStyle}>Warehouse Management</h2>
            <button type="button" onClick={() => setShowForm(true)} style={{ ...btnPrimary, background: "#0f766e" }}>Add Warehouse</button>
          </div>
          <div style={tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f766e", color: "#fff" }}>
                  <th style={th}>ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Address</th>
                  <th style={th}>Location</th>
                  <th style={th}>Employee</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w, i) => {
                  const locationName = locations.find(loc => (loc._id || loc.id) === w.location_id)?.name || "-";
                  const employeeIds = Array.isArray(w.employee_ids) && w.employee_ids.length
                    ? w.employee_ids.map((id) => String(id))
                    : w.employee_id
                    ? [String(w.employee_id)]
                    : [];
                  const employeeName = employeeIds
                    .map((id) => employees.find((emp) => String(emp._id || emp.id) === String(id))?.name)
                    .filter(Boolean)
                    .join(", ") || "-";
                  return (
                    <tr key={w.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{w.name || "-"}</td>
                      <td style={td}>{w.address || "-"}</td>
                      <td style={td}>{locationName}</td>
                      <td style={td}>{employeeName}</td>
                      <td style={td}>
                        <button type="button" onClick={() => handleEdit(w)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                        <button type="button" onClick={() => handleDelete(w.id)} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {warehouses.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: "20px" }}>No warehouses found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

const titleStyle = { margin: 0, fontSize: "18px", color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", maxWidth: "1000px", margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" };
const headerRow = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px", justifyContent: "space-between" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "start" };
const actionRow = { display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" };
const lbl = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#334155" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = { border: "none", color: "#fff", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
