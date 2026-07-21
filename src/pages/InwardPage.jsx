import React, { useState, useEffect, useRef } from "react";
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

const getRecordId = (record) => {
  if (!record) return "";
  if (typeof record === "string" || typeof record === "number") return String(record);
  return String(record.id || record._id || "");
};

const sameId = (left, right) =>
  String(left || "") !== "" && String(left || "") === String(right || "");

const sameText = (left, right) =>
  String(left || "").trim().toLowerCase() !== "" &&
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

const normalizeIdList = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((item) => getRecordId(item)).filter(Boolean);
};

const warehouseHasEmployee = (warehouse, employeeId, employees = []) => {
  const selectedEmployeeId = String(employeeId || "");
  if (!selectedEmployeeId) return true;

  const directEmployeeId = getRecordId(warehouse?.employee_id);
  const warehouseEmployeeIds = normalizeIdList(warehouse?.employee_ids);
  if (sameId(directEmployeeId, selectedEmployeeId) || warehouseEmployeeIds.some((id) => sameId(id, selectedEmployeeId))) {
    return true;
  }

  const warehouseId = getRecordId(warehouse);
  const employee = employees.find((item) => sameId(getRecordId(item), selectedEmployeeId));
  const assignedWarehouseIds = normalizeIdList(employee?.assigned_warehouse_ids);
  return assignedWarehouseIds.some((id) => sameId(id, warehouseId));
};

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
  const inwardFileRef = useRef(null);

  const canCreate = hasPermission(user, "inward.create");
  const canEdit = hasPermission(user, "inward.edit");
  const canDelete = hasPermission(user, "inward.delete");
  const canImport = hasPermission(user, "inward.import");
  const canExport = hasPermission(user, "inward.export");
  const canViewEmployees = hasPermission(user, "employees.view");
  const canAccessPage = canCreate || canEdit || canDelete || hasPermission(user, "inward.view");
  const assignedWarehouseIds = user?.assigned_warehouse_ids || [];

  const downloadInwardTemplate = async () => {
    try {
      const res = await axios.get(`${API_BASE}/inward/template-xlsx`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "inward-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Inward template downloaded", { theme: "colored" });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Template download failed", { theme: "colored" });
    }
  };

  const handleInwardUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/inward/import-xlsx`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data || {};
      toast.success(`Imported ${data.inserted || 0} inward rows`, { theme: "colored" });
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.info(`${data.skipped || 0} rows skipped`, { theme: "colored" });
      }
      fetchInwards();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Inward import failed", { theme: "colored" });
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchInwards();
  }, []);

  useEffect(() => {
    if (formData.employee_id) {
      const employeeId = String(formData.employee_id);
      const emp = employees.find((e) => sameId(getRecordId(e), employeeId));
      const assignedWarehouses = warehouses.filter(
        (w) => warehouseHasEmployee(w, employeeId, employees)
      );
      const currentWarehouseIsValid = assignedWarehouses.some(
        (w) => sameId(getRecordId(w), formData.warehouse_id)
      );
      const selectedWarehouse = currentWarehouseIsValid
        ? assignedWarehouses.find((w) => sameId(getRecordId(w), formData.warehouse_id))
        : assignedWarehouses[0];
      const warehouseLocationId = getRecordId(selectedWarehouse?.location_id);

      setFormData((prev) => ({
        ...prev,
        location_id: warehouseLocationId || getRecordId(emp?.location_id),
        warehouse_id:
          currentWarehouseIsValid
            ? prev.warehouse_id
            : assignedWarehouses.length > 0
            ? getRecordId(assignedWarehouses[0])
            : "",
      }));
    }
  }, [formData.employee_id, employees, warehouses, editData]);

  useEffect(() => {
    if (!formData.company_id || formData.company_account_id) return;

    const matchingAccount = companyAccounts.find((acc) => {
      return (
        sameId(getRecordId(acc.company_id), formData.company_id) ||
        sameText(acc.company_name, companies.find((c) => sameId(getRecordId(c), formData.company_id))?.name)
      );
    });

    if (matchingAccount) {
      setFormData((prev) => ({
        ...prev,
        company_account_id: getRecordId(matchingAccount),
      }));
    }
  }, [formData.company_id, formData.company_account_id, companyAccounts, companies]);

  // Filter warehouses by selected location
  const warehousesForLocation = formData.location_id
    ? warehouses.filter((w) => sameId(getRecordId(w.location_id), formData.location_id))
    : warehouses;

  const noWarehousesAvailable = formData.location_id && warehousesForLocation.length === 0;

  const fetchDropdowns = async () => {
    try {
      const [empRes, locRes, whRes, prodRes, compRes, accRes] = await Promise.all([
        canViewEmployees
          ? axios.get(`${API_BASE}/employees`)
          : Promise.resolve({
              data: user
                ? [{ id: getRecordId(user), name: user.name || user.username || "Current User", location_id: user.location_id }]
                : [],
            }),
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
    const { name, value } = e.target;

    if (name === "warehouse_id") {
      const selectedWarehouse = warehouses.find((item) => sameId(getRecordId(item), value));
      setFormData((prev) => ({
        ...prev,
        warehouse_id: value,
        location_id: getRecordId(selectedWarehouse?.location_id) || prev.location_id,
      }));
      return;
    }

    if (name === "company_id") {
      const selectedCompany = companies.find((item) => sameId(getRecordId(item), value));
      const matchingAccount = companyAccounts.find((acc) => {
        return (
          sameId(getRecordId(acc.company_id), value) ||
          sameText(acc.company_name, selectedCompany?.name)
        );
      });

      setFormData((prev) => ({
        ...prev,
        company_id: value,
        company_account_id: matchingAccount ? getRecordId(matchingAccount) : "",
      }));
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    const defaultWarehouseId =
      assignedWarehouseIds.length === 1 ? getRecordId(assignedWarehouseIds[0]) : "";

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

    if (!formData.company_account_id) {
      toast.error("Please select a company account", { theme: "colored" });
      return;
    }

    try {
      const payload = {
        ...formData,
        employee_id: formData.employee_id || null,
        location_id: formData.location_id || null,
        warehouse_id: formData.warehouse_id || null,
        product_id: formData.product_id || null,
        company_id: formData.company_id || null,
        company_account_id: formData.company_account_id || null,
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
    const rowCompany = companies.find((item) => sameId(getRecordId(item), row.company_id));
    const rowCompanyAccount =
      companyAccounts.find((acc) => sameId(getRecordId(acc), row.company_account_id)) ||
      companyAccounts.find((acc) => sameId(getRecordId(acc.company_id), row.company_id)) ||
      companyAccounts.find((acc) => sameText(acc.company_name, row.company_name || rowCompany?.name));
    setEditData(row);
    setFormData({
      date: row.date || "",
      employee_id: row.employee_id || "",
      location_id: "",
      warehouse_id: row.warehouse_id || "",
      product_id: row.product_id || "",
      company_id: row.company_id || "",
      company_account_id: row.company_account_id || getRecordId(rowCompanyAccount) || "",
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
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", marginBottom: "10px" }}>
            {canExport && (
              <button
                type="button"
                onClick={downloadInwardTemplate}
                style={{
                  ...btnStyle,
                  background: "#0f766e",
                  color: "#fff",
                  padding: "10px 14px",
                  boxShadow: "0 10px 18px rgba(15, 118, 110, 0.18)",
                }}
              >
                Download Excel
              </button>
            )}
            {canImport && (
              <button
                type="button"
                onClick={() => inwardFileRef.current?.click()}
                style={{
                  ...btnStyle,
                  background: "#16a34a",
                  color: "#fff",
                  padding: "10px 14px",
                  boxShadow: "0 10px 18px rgba(22, 163, 74, 0.18)",
                }}
              >
                Upload Excel
              </button>
            )}
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

      <input
        ref={inwardFileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleInwardUpload}
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
                      <option key={getRecordId(e)} value={getRecordId(e)}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Location">
                  <select name="location_id" value={formData.location_id} disabled style={{ ...inp, background: "#f8fafc" }}>
                    <option value="">Location</option>
                    {locations.map((l) => (
                      <option key={getRecordId(l)} value={getRecordId(l)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Warehouse">
                  {noWarehousesAvailable && (
                    <div style={{ padding: "8px 12px", marginBottom: "8px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "6px", color: "#92400e", fontSize: "13px" }}>
                      ⚠️ No warehouse is mapped to the selected location. Please map a warehouse first or select a different location.
                    </div>
                  )}
                  <select 
                    name="warehouse_id" 
                    value={formData.warehouse_id} 
                    onChange={handleChange} 
                    style={{...inp, borderColor: noWarehousesAvailable ? "#ef4444" : "#cbd5e1"}}
                    disabled={noWarehousesAvailable}
                  >
                    <option value="">Select Warehouse</option>
                    {warehousesForLocation
                      .filter((w) => warehouseHasEmployee(w, formData.employee_id, employees))
                      .map((w) => (
                      <option key={getRecordId(w)} value={getRecordId(w)}>
                        {w.location_name ? `${w.name} (${w.location_name})` : w.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Product">
                  <select name="product_id" value={formData.product_id} onChange={handleChange} style={inp}>
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={getRecordId(p)} value={getRecordId(p)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Company">
                  <select name="company_id" value={formData.company_id} onChange={handleChange} style={inp}>
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={getRecordId(c)} value={getRecordId(c)}>
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
                      .filter((acc) => {
                        if (!formData.company_id) return true;
                        return (
                          sameId(getRecordId(acc.company_id), formData.company_id) ||
                          sameText(acc.company_name, companies.find((c) => sameId(getRecordId(c), formData.company_id))?.name)
                        );
                      })
                      .map((acc) => (
                        <option key={getRecordId(acc)} value={getRecordId(acc)}>
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


