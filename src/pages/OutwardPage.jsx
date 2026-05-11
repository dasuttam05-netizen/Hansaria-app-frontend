import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdjustmentPage from "./AdjustmentPage";
import OutwardSettlementPage from "./OutwardSettlementPage";
import { hasPermission, loadSession } from "../utils/auth";

const lbl = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "12px",
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

export default function OutwardPage() {
  const API_BASE = "/api";
  const { user } = loadSession();

  const [outwards, setOutwards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedOutward, setSelectedOutward] = useState(null);
  const [selectedSettlementOutward, setSelectedSettlementOutward] = useState(null);
  const [hoveredOutwardId, setHoveredOutwardId] = useState(null);

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
    rate: "",
    inv_no: "",
    buyer_id: "",
    buyer_name: "",
    consignee_id: "",
    consignee_name: "",
    self_loading: "No",
  });

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [consigneeNames, setConsigneeNames] = useState([]);
  const [buyerNames, setBuyerNames] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({ currentStock: 0, reservedStock: 0, availableStock: 0, loading: false, error: "" });

  const consigneesForBuyer = useMemo(() => {
    if (!formData.buyer_id) return [];
    return consigneeNames.filter((c) => String(c.buyer_id || "") === String(formData.buyer_id));
  }, [formData.buyer_id, consigneeNames]);
  const canCreate = hasPermission(user, "outward.create");
  const canEdit = hasPermission(user, "outward.edit");
  const canDelete = hasPermission(user, "outward.delete");
  const canAdjust = hasPermission(user, "adjustment.manage");
  const canAccessPage =
    canCreate || canEdit || canDelete || canAdjust || hasPermission(user, "outward.view");
  const isSelfLoading = String(formData.self_loading || "No").trim().toLowerCase() === "yes";
  const requestedQty = Number(formData.weight) || 0;
  const availableStock = Number(warehouseStock.availableStock) || 0;
  const hasStockSelection = !isSelfLoading && Boolean(formData.warehouse_id && formData.product_id);
  const hasInsufficientStock = !isSelfLoading && hasStockSelection && requestedQty > 0 && requestedQty > availableStock;

  useEffect(() => {
    fetchDropdowns();
    fetchOutwards();
  }, []);

  useEffect(() => {
    if (formData.employee_id) {
      const employeeId = Number(formData.employee_id);
      const emp = employees.find((e) => e.id === employeeId);
      const assignedWarehouses = warehouses.filter(
        (w) => Number(w.employee_id) === employeeId
      );

      const currentWarehouseIsValid = assignedWarehouses.some(
        (w) => String(w.id) === formData.warehouse_id
      );

      setFormData((prev) => ({
        ...prev,
        location_id: emp?.location_id || "",
        warehouse_id:
          currentWarehouseIsValid
            ? prev.warehouse_id
            : assignedWarehouses.length > 0
            ? String(assignedWarehouses[0].id)
            : "",
      }));
    }
  }, [formData.employee_id, employees, warehouses, editData]);

  useEffect(() => {
    const loadWarehouseStock = async () => {
      if (isSelfLoading || !formData.warehouse_id || !formData.product_id) {
        setWarehouseStock({ currentStock: 0, reservedStock: 0, availableStock: 0, loading: false, error: "" });
        return;
      }

      try {
        setWarehouseStock((prev) => ({ ...prev, loading: true, error: "" }));
        const res = await axios.get(`${API_BASE}/outward/available-stock`, {
          params: {
            warehouse_id: formData.warehouse_id,
            product_id: formData.product_id,
            outward_id: editData?.id || "",
          },
        });
        const data = res.data || {};
        setWarehouseStock({
          currentStock: Number(data.currentStock) || 0,
          reservedStock: Number(data.reservedStock) || 0,
          availableStock: Number(data.availableStock) || 0,
          loading: false,
          error: "",
        });
      } catch (err) {
        console.error(err);
        setWarehouseStock({
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          loading: false,
          error: err?.response?.data?.error || "Failed to load stock",
        });
      }
    };

    loadWarehouseStock();
  }, [API_BASE, formData.warehouse_id, formData.product_id, editData?.id, isSelfLoading]);

  const fetchDropdowns = async () => {
    try {
      const [empRes, locRes, whRes, prodRes, compRes, accRes, consigneeRes, buyerRes] = await Promise.all([
        axios.get(`${API_BASE}/employees`),
        axios.get(`${API_BASE}/locations`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/company-accounts`),
        axios.get(`${API_BASE}/consignee-names`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/buyer-names`).catch(() => ({ data: [] })),
      ]);

      setEmployees(empRes.data || []);
      setLocations(locRes.data || []);
      setWarehouses(whRes.data || []);
      setProducts(prodRes.data || []);
      setCompanies(compRes.data || []);
      setCompanyAccounts(accRes.data || []);
      setConsigneeNames(Array.isArray(consigneeRes.data) ? consigneeRes.data : []);
      setBuyerNames(Array.isArray(buyerRes.data) ? buyerRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching dropdowns", { theme: "colored" });
    }
  };

  const fetchOutwards = async () => {
    try {
      const res = await axios.get(`${API_BASE}/outward`);
      setOutwards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching outwards", { theme: "colored" });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "buyer_id") {
      const b = buyerNames.find((x) => String(x.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        buyer_id: value,
        buyer_name: b ? b.name : "",
        consignee_id: "",
        consignee_name: "",
      }));
      return;
    }

    if (name === "consignee_id") {
      const c = consigneeNames.find((x) => String(x.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        consignee_id: value,
        consignee_name: c ? c.name : "",
      }));
      return;
    }

    if (name === "self_loading") {
      setFormData((prev) => ({
        ...prev,
        self_loading: value,
        warehouse_id: value === "Yes" ? "" : prev.warehouse_id,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () =>
    setFormData({
      date: "",
      employee_id: "",
      location_id: "",
      warehouse_id:
        (user?.assigned_warehouse_ids || []).length === 1
          ? String(user.assigned_warehouse_ids[0])
          : "",
      product_id: "",
      company_id: "",
      company_account_id: "",
      lorry_no: "",
      weight: "",
      rate: "",
      inv_no: "",
      buyer_id: "",
      buyer_name: "",
      consignee_id: "",
      consignee_name: "",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        employee_id: Number(formData.employee_id) || null,
        location_id: Number(formData.location_id) || null,
        warehouse_id: Number(formData.warehouse_id) || null,
        product_id: Number(formData.product_id) || null,
        company_id: Number(formData.company_id) || null,
        company_account_id: Number(formData.company_account_id) || null,
        lorry_no: formData.lorry_no || "",
        weight: Number(formData.weight) || 0,
        quantity: Number(formData.weight) || 0,
        rate: Number(formData.rate) || 0,
        buyer_name: formData.buyer_name || "",
        consignee_name: formData.consignee_name || "",
        inv_no: (formData.inv_no || "").trim(),
        self_loading: formData.self_loading || "No",
      };

      if (warehouseStock.loading) {
        toast.error("Warehouse stock is still loading", { theme: "colored" });
        return;
      }

      if (hasInsufficientStock) {
        toast.error(`Selected warehouse stock not available. Available stock is ${availableStock.toFixed(2)}.`, { theme: "colored" });
        return;
      }

      if (editData) {
        await axios.put(`${API_BASE}/outward/${editData.id}`, payload);
        toast.info("Outward updated successfully", { theme: "colored" });
      } else {
        await axios.post(`${API_BASE}/outward`, payload);
        toast.success("Outward saved successfully", { theme: "colored" });
      }

      setShowForm(false);
      setEditData(null);
      resetForm();
      fetchOutwards();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Error saving outward", { theme: "colored" });
    }
  };

  const handleEdit = (row) => {
    if (!canEdit) {
      toast.error("You only have create access. Edit is not allowed.", { theme: "colored" });
      return;
    }
    setEditData(row);
    const bName = (row.buyer_name || "").trim();
    const cName = (row.consignee_name || "").trim();
    const consigneeRow = consigneeNames.find((c) => (c.name || "").trim() === cName);
    let buyer_id = "";
    let consignee_id = "";
    if (consigneeRow && consigneeRow.buyer_id) {
      buyer_id = String(consigneeRow.buyer_id);
      consignee_id = String(consigneeRow.id);
    } else {
      const buyerRow = buyerNames.find((b) => (b.name || "").trim() === bName);
      if (buyerRow) {
        buyer_id = String(buyerRow.id);
        const cg = consigneeNames.find(
          (c) => (c.name || "").trim() === cName && String(c.buyer_id || "") === buyer_id
        );
        if (cg) consignee_id = String(cg.id);
      }
    }
    setFormData({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      employee_id: row.employee_id || "",
      location_id: "",
      warehouse_id: row.warehouse_id || "",
      product_id: row.product_id || "",
      company_id: row.company_id || "",
      company_account_id: row.company_account_id || "",
      lorry_no: row.lorry_no || "",
      weight: row.weight || "",
      rate: row.rate || "",
      inv_no: row.inv_no || "",
      buyer_id,
      buyer_name: row.buyer_name || "",
      consignee_id,
      consignee_name: row.consignee_name || "",
      self_loading: row.self_loading || "No",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error("Delete is not allowed for this user.", { theme: "colored" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this outward?")) return;

    try {
      await axios.delete(`${API_BASE}/outward/${id}`);
      toast.warn("Outward deleted successfully", { theme: "colored" });
      fetchOutwards();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Delete error", { theme: "colored" });
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
Account: ${row.party_name || row.account_name}
Lorry: ${row.lorry_no}
Weight: ${row.weight}
Rate: ${row.rate}
Inv No: ${row.inv_no || "—"}
Self Loading: ${row.self_loading || "No"}
Buyer: ${row.buyer_name}
Consignee: ${row.consignee_name}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.info("Copied to clipboard", { theme: "colored" }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const formatWeight = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(3) : "0.000";
  };

  const formatRate = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
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

  const tableFontSize = "13px";
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
    color: "#0f172a",
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

  const btnPrimary = {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  };

  const formCard = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    width: "100%",
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditData(null);
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
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            OUTWARD
          </div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>
            Outward Management
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
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
            TOTAL ENTRY
          </div>
          <div style={{ color: "#0f172a", fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
            {outwards.length}
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
              fontWeight: 700,
              boxShadow: "0 10px 18px rgba(24, 182, 217, 0.26)",
            }}
          >
            Add Outward
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
                  {editData ? "Edit Outward Entry" : "New Outward Entry"}
                </h2>
                <button type="button" onClick={closeFormModal} style={btnPrimary}>
                  Back To Outward List
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
                <Field label="Outward entry no">
                  <input
                    readOnly
                    value={editData?.sl_no != null ? String(editData.sl_no) : "— (auto)"}
                    style={{ ...inp, background: "#f8fafc", color: "#64748b" }}
                  />
                </Field>

                <Field label="Inv No">
                  <input
                    type="text"
                    name="inv_no"
                    placeholder="Enter invoice number"
                    value={formData.inv_no}
                    onChange={handleChange}
                    style={inp}
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
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} disabled={isSelfLoading} style={{ ...inp, background: isSelfLoading ? "#f8fafc" : "#fff" }}>
                    <option value="">{isSelfLoading ? "Self Loading - Warehouse Not Required" : "Select Warehouse"}</option>
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
                    {formData.company_id && companyAccounts
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

                <Field label="Available Stock">
                  <div>
                    <input
                      readOnly
                      value={isSelfLoading ? "N/A for Self Loading" : hasStockSelection ? (warehouseStock.loading ? "Loading..." : availableStock.toFixed(2)) : "Select warehouse and product"}
                      style={{ ...inp, background: "#f8fafc", color: hasInsufficientStock ? "#dc2626" : "#0f172a", fontWeight: 700 }}
                    />
                    {!isSelfLoading && hasStockSelection ? (
                      <div style={{ marginTop: "6px", fontSize: "12px", color: hasInsufficientStock ? "#dc2626" : warehouseStock.error ? "#dc2626" : "#475569" }}>
                        {warehouseStock.error || `Current: ${warehouseStock.currentStock.toFixed(2)} | Reserved: ${warehouseStock.reservedStock.toFixed(2)} | Available: ${availableStock.toFixed(2)}`}
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field label="Self Loading">
                  <select name="self_loading" value={formData.self_loading} onChange={handleChange} style={inp}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </Field>

                <Field label="Rate">
                  <input
                    type="number"
                    name="rate"
                    placeholder="Rate"
                    value={formData.rate}
                    onChange={handleChange}
                    style={inp}
                  />
                </Field>

                <Field label="Select buyer name">
                  <select name="buyer_id" value={formData.buyer_id} onChange={handleChange} style={inp}>
                    <option value="">Select buyer name</option>
                    {buyerNames.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select consignee">
                  <select
                    name="consignee_id"
                    value={formData.consignee_id}
                    onChange={handleChange}
                    style={{
                      ...inp,
                      opacity: formData.buyer_id ? 1 : 0.65,
                    }}
                    disabled={!formData.buyer_id}
                  >
                    <option value="">
                      {formData.buyer_id ? "Select consignee name" : "Select buyer first"}
                    </option>
                    {consigneesForBuyer.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={(editData ? !canEdit : !canCreate) || warehouseStock.loading || hasInsufficientStock}
                    style={{
                      ...btnPrimary,
                      opacity: ((editData ? !canEdit : !canCreate) || warehouseStock.loading || hasInsufficientStock) ? 0.5 : 1,
                      cursor: ((editData ? !canEdit : !canCreate) || warehouseStock.loading || hasInsufficientStock) ? "not-allowed" : "pointer",
                    }}
                  >
                    Save
                  </button>
                  <button type="button" onClick={closeFormModal} style={btnPrimary}>
                    Back To Outward List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>Outward Entries</h3>
        </div>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "78vh" }}>
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
                <th style={thStyle}>Outward no</th>
                <th style={thStyle}>Inv No</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Warehouse</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Account</th>
                <th style={thStyle}>Lorry</th>
                <th style={thStyle}>Weight</th>
                <th style={thStyle}>Rate</th>
                <th style={thStyle}>Self Loading</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Consignee</th>
                <th style={thActionsStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {outwards.length > 0 ? (
                outwards.map((row, idx) => {
                  const baseBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                  const rowBg = hoveredOutwardId === row.id ? rowHoverBg : baseBg;
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
                    onMouseEnter={() => setHoveredOutwardId(row.id)}
                    onMouseLeave={() => setHoveredOutwardId(null)}
                    style={{ background: rowBg, transition: "background-color 0.15s ease" }}
                  >
                    <td style={cellBase}>{row.sl_no != null ? row.sl_no : row.id}</td>
                    <td style={cellBase}>{row.inv_no || "—"}</td>
                    <td style={cellBase}>{formatDate(row.date)}</td>
                    <td style={cellBase}>{row.employee_name}</td>
                    <td style={cellBase}>{row.location_name}</td>
                    <td style={cellBase}>{row.warehouse_name}</td>
                    <td style={cellBase}>{row.product_name}</td>
                    <td style={cellBase}>{row.company_name}</td>
                    <td style={cellBase}>{row.party_name}</td>
                    <td style={cellBase}>{row.lorry_no}</td>
                    <td style={cellRight}>{formatWeight(row.weight)}</td>
                    <td style={cellRight}>{formatRate(row.rate)}</td>
                    <td style={cellBase}>{row.self_loading || "No"}</td>
                    <td style={cellBase}>{row.buyer_name}</td>
                    <td style={cellBase}>{row.consignee_name}</td>
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
                        {canAdjust ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOutward(row)}
                            title="Adjust"
                            aria-label="Adjust"
                            style={{ ...actionBtnStyle, background: "#f59e0b", color: "#fff", boxShadow: "0 10px 18px rgba(245, 158, 11, 0.28)" }}
                          >
                            <span style={actionIconStyle}>⚙</span>
                          </button>
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSettlementOutward(row)}
                            title="Settlement"
                            aria-label="Settlement"
                            style={{ ...actionBtnStyle, background: "#22c55e", color: "#fff", boxShadow: "0 10px 18px rgba(34, 197, 94, 0.28)" }}
                          >
                            <span style={actionIconStyle}>₹</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td style={{ ...tdStyle, textAlign: "center" }} colSpan="16">
                    No outward records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOutward && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "24px",
            zIndex: 1200,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: "1200px",
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
              padding: "18px",
              position: "relative",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => setSelectedOutward(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 34,
                height: 34,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              X
            </button>

            <AdjustmentPage outward={selectedOutward} />
          </div>
        </div>
      )}

      {selectedSettlementOutward && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "24px",
            zIndex: 1200,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: "1300px",
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
              padding: "18px",
              position: "relative",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => setSelectedSettlementOutward(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 34,
                height: 34,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              X
            </button>

            <OutwardSettlementPage
              outward={selectedSettlementOutward}
              onSaved={fetchOutwards}
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}




















