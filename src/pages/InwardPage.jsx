import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission, loadSession } from "../utils/auth";

const lbl = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "13px",
  color: "#334155",
};

const inp = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  boxSizing: "border-box",
  background: "#fff",
};

function Field({ label, children }) {
  return (
    <div>
      <span style={lbl}>{label}</span>
      {children}
    </div>
  );
}

export default function InwardPage() {
  const API_BASE = "/api";
  const { user } = loadSession();
  const [inwards, setInwards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [hoveredInwardId, setHoveredInwardId] = useState(null);

  const [formData, setFormData] = useState({
    date: "",
    employee_id: "",
    location_id: "",
    warehouse_id: "",
    product_id: "",
    company_id: "",
    company_account_id: "",
    lorry_no: "",
    weight: "",
  });

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);

  const canCreate = hasPermission(user, "inward.create");
  const canEdit = hasPermission(user, "inward.edit");
  const canDelete = hasPermission(user, "inward.delete");
  const canAccessPage = canCreate || canEdit || canDelete || hasPermission(user, "inward.view");
  const assignedWarehouseIds = user?.assigned_warehouse_ids || [];

  useEffect(() => {
    fetchDropdowns();
    fetchInwards();
  }, []);

  useEffect(() => {
    if (formData.employee_id) {
      const employeeId = Number(formData.employee_id);
      const emp = employees.find((e) => e.id === employeeId);
      const assignedWarehouses = warehouses.filter(
        (w) => Number(w.employee_id) === employeeId
      );

      setFormData((prev) => ({
        ...prev,
        location_id: emp?.location_id || "",
        warehouse_id:
          assignedWarehouses.length > 0
            ? String(assignedWarehouses[0].id)
            : "",
      }));
    }
  }, [formData.employee_id, employees, warehouses]);

  const fetchDropdowns = async () => {
    try {
      const [empRes, locRes, whRes, prodRes, compRes, accRes] = await Promise.all([
        axios.get(`${API_BASE}/employees`),
        axios.get(`${API_BASE}/locations`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/company-accounts`),
      ]);

      setEmployees(empRes.data || []);
      setLocations(locRes.data || []);
      setWarehouses(whRes.data || []);
      setProducts(prodRes.data || []);
      setCompanies(compRes.data || []);
      setCompanyAccounts(accRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching dropdowns", { theme: "colored" });
    }
  };

  const fetchInwards = async () => {
    try {
      const res = await axios.get(`${API_BASE}/inward`);
      setInwards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching inwards", { theme: "colored" });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    const defaultWarehouseId =
      assignedWarehouseIds.length === 1 ? String(assignedWarehouseIds[0]) : "";

    setFormData({
      date: "",
      employee_id: "",
      location_id: "",
      warehouse_id: defaultWarehouseId,
      product_id: "",
      company_id: "",
      company_account_id: "",
      lorry_no: "",
      weight: "",
    });
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        employee_id: formData.employee_id ? Number(formData.employee_id) : null,
        location_id: formData.location_id ? Number(formData.location_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        product_id: formData.product_id ? Number(formData.product_id) : null,
        company_id: formData.company_id ? Number(formData.company_id) : null,
        company_account_id: formData.company_account_id
          ? Number(formData.company_account_id)
          : null,
        weight: Number(formData.weight) || 0,
      };

      if (editData) {
        await axios.put(`${API_BASE}/inward/${editData.id}`, payload);
        toast.info("Inward updated successfully", { theme: "colored" });
      } else {
        await axios.post(`${API_BASE}/inward`, payload);
        toast.success("Inward saved successfully", { theme: "colored" });
      }

      closeFormModal();
      resetForm();
      fetchInwards();
    } catch (err) {
      console.error(err);
      toast.error("Error saving inward", { theme: "colored" });
    }
  };

  const handleEdit = (row) => {
    if (!canEdit) {
      toast.error("You only have create access. Edit is not allowed.", { theme: "colored" });
      return;
    }
    setEditData(row);
    setFormData({
      date: row.date || "",
      employee_id: row.employee_id || "",
      location_id: row.location_id || "",
      warehouse_id: row.warehouse_id || "",
      product_id: row.product_id || "",
      company_id: row.company_id || "",
      company_account_id: row.company_account_id || "",
      lorry_no: row.lorry_no || "",
      weight: row.weight || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error("Delete is not allowed for this user.", { theme: "colored" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this inward?")) return;

    try {
      await axios.delete(`${API_BASE}/inward/${id}`);
      toast.warn("Inward deleted successfully", { theme: "colored" });
      fetchInwards();
    } catch (err) {
      console.error(err);
      toast.error("Delete error", { theme: "colored" });
    }
  };

  const handleCopy = (row) => {
    const text = `
Date: ${formatDate(row.date)}
Employee: ${row.employee_name}
Location: ${row.location_name}
Warehouse: ${row.warehouse_name}
Product: ${row.product_name}
Company: ${row.company_name}
Account: ${row.company_account_name}
Lorry: ${row.lorry_no}
Weight: ${row.weight}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.info("Copied to clipboard", { theme: "colored" });
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const pageStyle = {
    fontFamily: "Segoe UI, Arial, sans-serif",
    padding: "20px",
    background: "#f8fafc",
    minHeight: "100vh",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  };

  const btnStyle = {
    padding: "8px 12px",
    fontSize: "12px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  };

  const btnPrimary = {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  };

  const formCard = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    width: "100%",
  };

  const tableFontSize = "10px";
  const rowHoverBg = "#e0f4ff";

  const thStyle = {
    padding: "7px 8px",
    border: "1px solid #dbe7f1",
    background: "#0f766e",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 3,
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1,
  };

  const thActionsStyle = {
    ...thStyle,
    right: 0,
    zIndex: 4,
    minWidth: "210px",
    boxShadow: "-10px 0 18px rgba(15, 23, 42, 0.08)",
  };

  const tdStyle = {
    padding: "3px 6px",
    border: "1px solid #edf2f7",
    verticalAlign: "middle",
    background: "#fff",
    whiteSpace: "nowrap",
    fontSize: "12px",
    lineHeight: 1.05,
    fontWeight: 500,
  };

  const tdStyleRight = {
    ...tdStyle,
    textAlign: "right",
  };

  const actionIconStyle = {
    fontSize: "13px",
    lineHeight: 1,
  };

  const actionBtnStyle = {
    width: "32px",
    height: "32px",
    padding: 0,
    fontSize: "13px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={pageStyle}>
      {!canAccessPage ? (
        <div style={{ ...cardStyle, padding: "24px", textAlign: "center", color: "#64748b" }}>
          You do not have access to this page.
        </div>
      ) : (
        <>
      <div
        style={{
          ...cardStyle,
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexWrap: "wrap",
          gap: "12px",
          background: "linear-gradient(90deg, #d8f1fb 0%, #e7f4fa 22%, #edf6fb 48%, #d9edf9 100%)",
          border: "1px solid #9dd8fb",
          borderRadius: "16px",
          boxShadow: "0 10px 24px rgba(14, 165, 233, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "64px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "28px",
              borderRadius: "999px",
              border: "1px solid #8ed8ff",
              background: "rgba(255,255,255,0.18)",
              color: "#1e293b",
              fontSize: "12px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            INWARD
          </div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>
            Inward Management
          </h2>
        </div>

        <div
          style={{
            minWidth: "150px",
            background: "rgba(255,255,255,0.92)",
            borderRadius: "22px",
            boxShadow: "0 16px 26px rgba(59, 130, 246, 0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px 16px",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 500, marginBottom: "6px" }}>
            TOTAL ENTRY
          </div>
          <div style={{ color: "#0f172a", fontSize: "18px", fontWeight: 800, marginBottom: "10px" }}>
            {inwards.length}
          </div>
          <button
            onClick={() => {
              setEditData(null);
              resetForm();
              setShowForm(true);
            }}
            disabled={!canCreate}
            style={{
              ...btnStyle,
              background: canCreate ? "#18b6d9" : "#94a3b8",
              color: "#fff",
              padding: "10px 18px",
              minWidth: "110px",
              fontWeight: 500,
              boxShadow: "0 10px 18px rgba(24, 182, 217, 0.26)",
            }}
          >
            Add Inward
          </button>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar
        newestOnTop
        closeOnClick
        transition={Slide}
      />

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "20px 12px",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1000px",
              maxHeight: "92vh",
              overflowY: "auto",
              position: "relative",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={closeFormModal}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                zIndex: 2,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              X
            </button>

            <div style={formCard}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                  paddingRight: "40px",
                }}
              >
                <h2 style={{ margin: 0, flex: 1, color: "#0f172a", fontSize: "18px" }}>
                  {editData ? "Edit Inward Entry" : "New Inward Entry"}
                </h2>
                <button type="button" onClick={closeFormModal} style={btnPrimary}>
                  Back To Inward List
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                <Field label="Inward entry no">
                  <input
                    readOnly
                    value={editData?.sl_no != null ? String(editData.sl_no) : "— (auto)"}
                    style={{ ...inp, background: "#f8fafc", color: "#64748b" }}
                  />
                </Field>

                <Field label="Date">
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inp} />
                </Field>

                <Field label="Select Employee">
                  <select name="employee_id" value={formData.employee_id} onChange={handleChange} required style={inp}>
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Location">
                  <select name="location_id" value={formData.location_id} disabled style={{ ...inp, background: "#f8fafc" }}>
                    <option value="">Location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Warehouse">
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Product">
                  <select name="product_id" value={formData.product_id} onChange={handleChange} style={inp}>
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Company">
                  <select name="company_id" value={formData.company_id} onChange={handleChange} style={inp}>
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Account">
                  <select
                    name="company_account_id"
                    value={formData.company_account_id}
                    onChange={handleChange}
                    style={inp}
                  >
                    <option value="">Select Account</option>
                    {companyAccounts
                      .filter((acc) => acc.company_id === Number(formData.company_id))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name}
                        </option>
                      ))}
                  </select>
                </Field>

                <Field label="Lorry No">
                  <input
                    type="text"
                    name="lorry_no"
                    placeholder="Lorry No"
                    value={formData.lorry_no}
                    onChange={handleChange}
                    style={inp}
                  />
                </Field>

                <Field label="Weight">
                  <input
                    type="number"
                    name="weight"
                    placeholder="Weight"
                    value={formData.weight}
                    onChange={handleChange}
                    style={inp}
                  />
                </Field>

                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={editData ? !canEdit : !canCreate}
                    style={{
                      ...btnPrimary,
                      opacity: editData ? (canEdit ? 1 : 0.5) : canCreate ? 1 : 0.5,
                      cursor: editData ? (canEdit ? "pointer" : "not-allowed") : canCreate ? "pointer" : "not-allowed",
                    }}
                  >
                    Save
                  </button>
                  <button type="button" onClick={closeFormModal} style={btnPrimary}>
                    Back To Inward List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: tableFontSize,
              minWidth: "1080px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Inward no</th>
                <th style={thStyle}>Voucher</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Warehouse</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Account</th>
                <th style={thStyle}>Lorry</th>
                <th style={thStyle}>Weight</th>
                <th style={thActionsStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {inwards.length > 0 ? (
                inwards.map((row, idx) => {
                  const baseBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                  const rowBg = hoveredInwardId === row.id ? rowHoverBg : baseBg;
                  const cellBase = { ...tdStyle, background: rowBg };
                  const cellRight = { ...tdStyleRight, background: rowBg };
                  const actionsCell = {
                    ...tdStyle,
                    background: rowBg,
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                    minWidth: "210px",
                    verticalAlign: "middle",
                    boxShadow: "-6px 0 10px rgba(15, 23, 42, 0.06)",
                  };
                  return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredInwardId(row.id)}
                    onMouseLeave={() => setHoveredInwardId(null)}
                    style={{ background: rowBg, transition: "background-color 0.15s ease" }}
                  >
                    <td style={cellBase}>{row.sl_no != null ? row.sl_no : row.id}</td>
                    <td style={cellBase}>{row.voucher_no || "—"}</td>
                    <td style={cellBase}>{formatDate(row.date)}</td>
                    <td style={cellBase}>{row.employee_name}</td>
                    <td style={cellBase}>{row.location_name}</td>
                    <td style={cellBase}>{row.warehouse_name}</td>
                    <td style={cellBase}>{row.product_name}</td>
                    <td style={cellBase}>{row.company_name}</td>
                    <td style={cellBase}>{row.company_account_name}</td>
                    <td style={cellBase}>{row.lorry_no}</td>
                    <td style={cellRight}>{row.weight}</td>
                    <td style={actionsCell}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          flexWrap: "nowrap",
                          gap: "6px",
                          justifyContent: "center",
                          alignItems: "center",
                          maxWidth: "100%",
                          margin: "0 auto",
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            title="Edit"
                            aria-label="Edit"
                            style={{ ...actionBtnStyle, background: "#3b82f6", color: "#fff", boxShadow: "0 10px 18px rgba(59, 130, 246, 0.28)" }}
                          >
                            <span style={actionIconStyle}>✎</span>
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            title="Delete"
                            aria-label="Delete"
                            style={{ ...actionBtnStyle, background: "#ef4444", color: "#fff", boxShadow: "0 10px 18px rgba(239, 68, 68, 0.26)" }}
                          >
                            <span style={actionIconStyle}>🗑</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleCopy(row)}
                          title="Copy"
                          aria-label="Copy"
                          style={{ ...actionBtnStyle, background: "#64748b", color: "#fff", boxShadow: "0 10px 18px rgba(100, 116, 139, 0.24)" }}
                        >
                          <span style={actionIconStyle}>⧉</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td style={{ ...tdStyle, textAlign: "center" }} colSpan="12">
                    No inward entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}


