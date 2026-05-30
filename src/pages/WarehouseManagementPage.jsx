import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const emptyForm = () => ({
  name: "",
  address: "",
  pincode: "",
  state: "",
  district: "",
  city: "",
  room_floor_building: "",
  street_locality_landmark: "",
  location_id: "",
  employee_id: "",
  employee_ids: [],
  opening_balance: "0",
  opening_balance_type: "dr",
});

const emptySaleForm = () => ({
  voucher_no: "",
  date: new Date().toISOString().slice(0, 10),
  buyer_id: "",
  buyer_name: "",
  account_id: "",
  gst: "",
  pan: "",
  mobile: "",
  state: "",
  warehouse_id: "",
  employee_id: "",
  employee_name: "",
  employee_mobile: "",
  rst_no: "",
  product_id: "",
  product_name: "",
  packet: "",
  gross_weight: "",
  tare_weight: "",
  net_qty: "",
  rate: "",
  amount: "",
  goods: [],
  gross_amount: 0,
  total_deduction: 0,
  round_off: 0,
  net_amount: 0,
  deduction_details: {
    unloading_date: "",
    unloading_weight: "",
    moisture: "",
    dunky: "",
    fungus: "",
    discolour: "",
    others: "",
  },
});

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

const normalizeIdArray = (input) => {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => normalizeId(item))
        .filter(Boolean)
    )
  );
};

const collectWarehouseEmployeeIds = (warehouse, employees) => {
  const warehouseId = normalizeId(warehouse?._id || warehouse?.id);
  const fromWarehouse = normalizeIdArray(warehouse?.employee_ids).length
    ? normalizeIdArray(warehouse?.employee_ids)
    : normalizeId(warehouse?.employee_id)
    ? [normalizeId(warehouse?.employee_id)]
    : [];

  const fromEmployeeSide = normalizeIdArray(
    (employees || [])
      .filter((emp) =>
        normalizeIdArray(emp?.assigned_warehouse_ids).includes(warehouseId)
      )
      .map((emp) => normalizeId(emp?._id || emp?.id))
  );

  return Array.from(new Set([...fromWarehouse, ...fromEmployeeSide]));
};

export default function WarehouseManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("warehouse"); // "warehouse" or "sale"
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  
  // Sale Entry States
  const [saleFormData, setSaleFormData] = useState(emptySaleForm);
  const [buyerNames, setBuyerNames] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [showDeductionModal, setShowDeductionModal] = useState(false);

  const API_URL = "/api/warehouses";

  const fetchAll = async () => {
    try {
      const [wRes, lRes, eRes, bRes, pRes, cRes, acRes] = await Promise.all([
        axios.get("/api/warehouses"),
        axios.get("/api/locations"),
        axios.get("/api/employees"),
        axios.get("/api/buyer-names").catch(() => ({ data: [] })),
        axios.get("/api/products").catch(() => ({ data: [] })),
        axios.get("/api/companies").catch(() => ({ data: [] })),
        axios.get("/api/company-accounts").catch(() => ({ data: [] })),
      ]);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
      setLocations(Array.isArray(lRes.data) ? lRes.data : []);
      setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      setBuyerNames(Array.isArray(bRes.data) ? bRes.data : []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
      setCompanyAccounts(Array.isArray(acRes.data) ? acRes.data : []);
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
        ? normalizeIdArray(formData.employee_ids)
        : [];
      const payload = {
        name: formData.name,
        address: formData.address,
        pincode: formData.pincode || null,
        state: formData.state || null,
        district: formData.district || null,
        city: formData.city || null,
        room_floor_building: formData.room_floor_building || null,
        street_locality_landmark: formData.street_locality_landmark || null,
        location_id: formData.location_id || null,
        employee_id: safeEmployeeIds[0] || null,
        employee_ids: safeEmployeeIds,
        opening_balance: Number(formData.opening_balance || 0),
        opening_balance_type:
          String(formData.opening_balance_type || "dr").toLowerCase() === "cr"
            ? "cr"
            : "dr",
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
    const safeEmployeeIds = normalizeIdArray(w.employee_ids).length
      ? normalizeIdArray(w.employee_ids)
      : normalizeId(w.employee_id)
      ? [normalizeId(w.employee_id)]
      : [];
    setFormData({
      name: w.name || "",
      address: w.address || "",
      pincode: w.pincode || "",
      state: w.state || "",
      district: w.district || "",
      city: w.city || "",
      room_floor_building: w.room_floor_building || "",
      street_locality_landmark: w.street_locality_landmark || "",
      location_id: normalizeId(w.location_id),
      employee_id: safeEmployeeIds[0] || "",
      employee_ids: safeEmployeeIds,
      opening_balance: String(w.opening_balance ?? 0),
      opening_balance_type: String(w.opening_balance_type || "dr"),
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
      const primaryLocation = normalizeId(emp.location_id);
      const multiLocations = normalizeIdArray(emp.location_ids);
      return primaryLocation === String(formData.location_id) || multiLocations.includes(String(formData.location_id));
    });
  }, [employeeOptions, employees, formData.location_id]);

  const stableEmployeeOptions = useMemo(() => {
    const baseMap = new Map(
      filteredEmployeeOptions.map((opt) => [String(opt.value), opt])
    );

    (formData.employee_ids || []).forEach((id) => {
      const key = String(id);
      if (baseMap.has(key)) return;
      const emp = employees.find((e) => String(e._id || e.id) === key);
      if (emp) {
        baseMap.set(key, {
          value: key,
          label: emp.name || emp.username || `Employee ${key}`,
        });
      }
    });

    return Array.from(baseMap.values());
  }, [filteredEmployeeOptions, formData.employee_ids, employees]);

  // Sale Entry Handlers
  const handleSaleBuyerChange = (e) => {
    const buyerId = e.target.value;
    const buyer = buyerNames.find((b) => String(b._id || b.id) === String(buyerId));
    if (buyer) {
      setSaleFormData((prev) => ({
        ...prev,
        buyer_id: buyerId,
        buyer_name: buyer.name || "",
        account_id: "", // buyer_names doesn't have account_id, will need to link manually
        gst: buyer.gst_no || "",
        pan: buyer.pan_no || "",
        mobile: buyer.mobile || "",
        state: buyer.state || "",
      }));
    }
  };

  const handleSaleEmployeeChange = (e) => {
    const empId = e.target.value;
    const emp = employees.find((e) => String(e._id || e.id) === String(empId));
    if (emp) {
      setSaleFormData((prev) => ({
        ...prev,
        employee_id: empId,
        employee_name: emp.name || emp.username || "",
        employee_mobile: emp.mobile || "",
      }));
    }
  };

  const handleSaleProductChange = (e) => {
    const prodId = e.target.value;
    const product = products.find((p) => String(p._id || p.id) === String(prodId));
    if (product) {
      setSaleFormData((prev) => ({
        ...prev,
        product_id: prodId,
        product_name: product.name || "",
      }));
    }
  };

  const handleAddGoodsRow = () => {
    const newRow = {
      sl_no: (saleFormData.goods?.length || 0) + 1,
      product_id: saleFormData.product_id,
      product_name: saleFormData.product_name,
      packet: saleFormData.packet,
      gross_weight: saleFormData.gross_weight,
      tare_weight: saleFormData.tare_weight,
      net_qty: parseFloat(saleFormData.gross_weight || 0) - parseFloat(saleFormData.tare_weight || 0),
      rate: saleFormData.rate,
      amount: (parseFloat(saleFormData.gross_weight || 0) - parseFloat(saleFormData.tare_weight || 0)) * parseFloat(saleFormData.rate || 0),
    };
    setSaleFormData((prev) => ({
      ...prev,
      goods: [...(prev.goods || []), newRow],
      gross_amount: (prev.gross_amount || 0) + newRow.amount,
    }));
  };

  const handleSaveSale = async () => {
    if (!saleFormData.buyer_id || !saleFormData.employee_id || saleFormData.goods.length === 0) {
      toast.error("Please fill all required fields", { theme: "colored" });
      return;
    }
    try {
      const payload = {
        ...saleFormData,
        net_amount_payable: saleFormData.gross_amount - saleFormData.total_deduction + saleFormData.round_off,
      };
      await axios.post("/api/warehouse-purchase-vouchers", payload);
      toast.success("Sale Entry saved successfully!", { theme: "colored" });
      setSaleFormData(emptySaleForm());
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Error saving sale entry", { theme: "colored" });
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar transition={Slide} />
      
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "0" }}>
        <button
          type="button"
          onClick={() => setActiveTab("warehouse")}
          style={{
            ...tabBtn,
            background: activeTab === "warehouse" ? "#0f766e" : "#e2e8f0",
            color: activeTab === "warehouse" ? "#fff" : "#334155",
            borderBottom: activeTab === "warehouse" ? "3px solid #0f766e" : "none",
          }}
        >
          Warehouse Management
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sale")}
          style={{
            ...tabBtn,
            background: activeTab === "sale" ? "#0f766e" : "#e2e8f0",
            color: activeTab === "sale" ? "#fff" : "#334155",
            borderBottom: activeTab === "sale" ? "3px solid #0f766e" : "none",
          }}
        >
          Sale Entry
        </button>
        <button
          type="button"
          onClick={() => navigate("/warehouse-trading?tab=reports&report=purchase-party-ledger")}
          style={{
            ...tabBtn,
            background: "#e2e8f0",
            color: "#334155",
          }}
        >
          Purchase Party Ledger
        </button>
        <button
          type="button"
          onClick={() => navigate("/warehouse-trading?tab=reports&report=sale-party-ledger")}
          style={{
            ...tabBtn,
            background: "#e2e8f0",
            color: "#334155",
          }}
        >
          Sale Party Ledger
        </button>
      </div>

      {activeTab === "warehouse" ? (
        // Warehouse Management Tab
        showForm ? (
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
                <Field label="PIN No">
                  <input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="6 digit PIN No." style={inp} />
                </Field>
                <Field label="State">
                  <input name="state" value={formData.state} onChange={handleChange} placeholder="State" style={inp} />
                </Field>
                <Field label="District">
                  <input name="district" value={formData.district} onChange={handleChange} placeholder="District" style={inp} />
                </Field>
                <Field label="City">
                  <input name="city" value={formData.city} onChange={handleChange} placeholder="City" style={inp} />
                </Field>
                <Field label="Room / Floor / Building">
                  <input name="room_floor_building" value={formData.room_floor_building} onChange={handleChange} placeholder="Room No / Floor / Building" style={inp} />
                </Field>
                <Field label="Street / Locality / Landmark">
                  <input name="street_locality_landmark" value={formData.street_locality_landmark} onChange={handleChange} placeholder="Street / Locality / Landmark" style={inp} />
                </Field>
                <Field label="Assign Employee">
                  <MultiSelectDropdown
                    label=""
                    options={stableEmployeeOptions}
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
                <Field label="Opening Balance">
                  <input
                    name="opening_balance"
                    value={formData.opening_balance}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    style={inp}
                  />
                </Field>
                <Field label="Balance Type">
                  <select
                    name="opening_balance_type"
                    value={formData.opening_balance_type}
                    onChange={handleChange}
                    style={inp}
                  >
                    <option value="dr">Dr</option>
                    <option value="cr">Cr</option>
                  </select>
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
                    <th style={th}>Opening</th>
                    <th style={th}>Employee</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((w, i) => {
                    const rowLocationId = normalizeId(w.location_id);
                    const locationName = locations.find(loc => String(loc._id || loc.id) === rowLocationId)?.name || "-";
                    const employeeIds = collectWarehouseEmployeeIds(w, employees);
                    const employeeNamesFromApi = Array.isArray(w.employee_names)
                      ? w.employee_names.filter(Boolean)
                      : [];
                    const employeeName = employeeNamesFromApi.length
                      ? employeeNamesFromApi.join(", ")
                      : employeeIds
                          .map((id) => employees.find((emp) => String(emp._id || emp.id) === String(id))?.name)
                          .filter(Boolean)
                          .join(", ") || "-";
                    return (
                      <tr key={w.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{w.name || "-"}</td>
                        <td style={td}>{w.address || "-"}</td>
                        <td style={td}>{locationName}</td>
                        <td style={td}>{`${Number(w.opening_balance ?? 0).toFixed(2)} ${String(w.opening_balance_type || "dr").toUpperCase()}`}</td>
                        <td style={td}>{employeeName}</td>
                        <td style={td}>
                          <button type="button" onClick={() => handleEdit(w)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                          <button type="button" onClick={() => handleDelete(w.id)} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                  {warehouses.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: "20px" }}>No warehouses found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : (
        // Sale Entry Tab
        <SaleEntryForm
          saleFormData={saleFormData}
          setSaleFormData={setSaleFormData}
          buyerNames={buyerNames}
          employees={employees}
          products={products}
          warehouses={warehouses}
          handleSaleBuyerChange={handleSaleBuyerChange}
          handleSaleEmployeeChange={handleSaleEmployeeChange}
          handleSaleProductChange={handleSaleProductChange}
          handleAddGoodsRow={handleAddGoodsRow}
          handleSaveSale={handleSaveSale}
          showDeductionModal={showDeductionModal}
          setShowDeductionModal={setShowDeductionModal}
          inp={inp}
        />
      )}
    </div>
  );
}

function SaleEntryForm({
  saleFormData,
  setSaleFormData,
  buyerNames,
  employees,
  products,
  warehouses,
  handleSaleBuyerChange,
  handleSaleEmployeeChange,
  handleSaleProductChange,
  handleAddGoodsRow,
  handleSaveSale,
  showDeductionModal,
  setShowDeductionModal,
  inp,
}) {
  return (
    <div style={card}>
      <h2 style={titleStyle}>Purchase Voucher - Sale Entry</h2>
      
      <div style={formGrid}>
        <Field label="Voucher No">
          <input type="text" value={saleFormData.voucher_no} onChange={(e) => setSaleFormData((prev) => ({ ...prev, voucher_no: e.target.value }))} placeholder="Auto" style={inp} />
        </Field>
        <Field label="Date">
          <input type="date" value={saleFormData.date} onChange={(e) => setSaleFormData((prev) => ({ ...prev, date: e.target.value }))} style={inp} />
        </Field>
        <Field label="Buyer Name *">
          <select value={saleFormData.buyer_id} onChange={handleSaleBuyerChange} style={inp}>
            <option value="">Select Buyer</option>
            {buyerNames.map((b) => (
              <option key={b._id || b.id} value={String(b._id || b.id)}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <input type="text" value={saleFormData.account_id} readOnly style={inp} />
        </Field>
        <Field label="GST">
          <input type="text" value={saleFormData.gst} readOnly style={inp} />
        </Field>
        <Field label="PAN">
          <input type="text" value={saleFormData.pan} readOnly style={inp} />
        </Field>
        <Field label="Mobile">
          <input type="text" value={saleFormData.mobile} readOnly style={inp} />
        </Field>
        <Field label="State">
          <input type="text" value={saleFormData.state} readOnly style={inp} />
        </Field>
        <Field label="Warehouse Name *">
          <select value={saleFormData.warehouse_id} onChange={(e) => setSaleFormData((prev) => ({ ...prev, warehouse_id: e.target.value }))} style={inp}>
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => (
              <option key={w._id || w.id} value={String(w._id || w.id)}>{w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Employee Name *">
          <select value={saleFormData.employee_id} onChange={handleSaleEmployeeChange} style={inp}>
            <option value="">Select Employee</option>
            {employees.map((e) => (
              <option key={e._id || e.id} value={String(e._id || e.id)}>{e.name || e.username}</option>
            ))}
          </select>
        </Field>
        <Field label="Employee Mobile">
          <input type="text" value={saleFormData.employee_mobile} readOnly style={inp} />
        </Field>
        <Field label="RST No">
          <input type="text" value={saleFormData.rst_no} onChange={(e) => setSaleFormData((prev) => ({ ...prev, rst_no: e.target.value }))} placeholder="RST No" style={inp} />
        </Field>
      </div>

      {/* Goods Details Section */}
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "12px" }}>Goods Sale Details</h3>
        <div style={formGrid}>
          <Field label="Product *">
            <select value={saleFormData.product_id} onChange={handleSaleProductChange} style={inp}>
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p._id || p.id} value={String(p._id || p.id)}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Packet">
            <input type="text" value={saleFormData.packet} onChange={(e) => setSaleFormData((prev) => ({ ...prev, packet: e.target.value }))} placeholder="Packet" style={inp} />
          </Field>
          <Field label="Gross Wt">
            <input type="number" value={saleFormData.gross_weight} onChange={(e) => setSaleFormData((prev) => ({ ...prev, gross_weight: e.target.value }))} placeholder="Gross Weight" style={inp} />
          </Field>
          <Field label="Tare Wt">
            <input type="number" value={saleFormData.tare_weight} onChange={(e) => setSaleFormData((prev) => ({ ...prev, tare_weight: e.target.value }))} placeholder="Tare Weight" style={inp} />
          </Field>
          <Field label="Net Qty (Auto)">
            <input type="number" value={parseFloat(saleFormData.gross_weight || 0) - parseFloat(saleFormData.tare_weight || 0)} readOnly style={inp} />
          </Field>
          <Field label="Rate">
            <input type="number" value={saleFormData.rate} onChange={(e) => setSaleFormData((prev) => ({ ...prev, rate: e.target.value }))} placeholder="Rate" style={inp} />
          </Field>
          <Field label="Amount">
            <input type="number" value={(parseFloat(saleFormData.gross_weight || 0) - parseFloat(saleFormData.tare_weight || 0)) * parseFloat(saleFormData.rate || 0)} readOnly style={inp} />
          </Field>
        </div>
        <button type="button" onClick={handleAddGoodsRow} style={{ ...btnPrimary, marginTop: "12px" }}>Add to Goods List</button>
      </div>

      {/* Goods Table */}
      {saleFormData.goods && saleFormData.goods.length > 0 && (
        <div style={{ marginBottom: "24px", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#0f766e", color: "#fff" }}>
                <th style={{ ...th, width: "40px" }}>S.L</th>
                <th style={th}>Product</th>
                <th style={th}>Packet</th>
                <th style={th}>Gross Wt</th>
                <th style={th}>Tare Wt</th>
                <th style={th}>Net Qty</th>
                <th style={th}>Rate</th>
                <th style={th}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {saleFormData.goods.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={td}>{row.sl_no}</td>
                  <td style={td}>{row.product_name}</td>
                  <td style={td}>{row.packet}</td>
                  <td style={{ ...td, textAlign: "right" }}>{parseFloat(row.gross_weight || 0).toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{parseFloat(row.tare_weight || 0).toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{parseFloat(row.net_qty || 0).toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{parseFloat(row.rate || 0).toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{parseFloat(row.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale Summary */}
      <div style={{ marginBottom: "24px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#f8fafc" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "12px" }}>Sale Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <div>
            <label style={lbl}>Gross Amount</label>
            <input type="number" value={saleFormData.gross_amount} readOnly style={inp} />
          </div>
          <div>
            <label style={lbl}>Total Deduction <button type="button" onClick={() => setShowDeductionModal(true)} style={{ marginLeft: "8px", ...mini, background: "#2563eb" }}>F2</button></label>
            <input type="number" value={saleFormData.total_deduction} onChange={(e) => setSaleFormData((prev) => ({ ...prev, total_deduction: parseFloat(e.target.value) || 0 }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>Round Off</label>
            <input type="number" value={saleFormData.round_off} onChange={(e) => setSaleFormData((prev) => ({ ...prev, round_off: parseFloat(e.target.value) || 0 }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>Net Amount Payable</label>
            <input type="number" value={saleFormData.gross_amount - saleFormData.total_deduction + saleFormData.round_off} readOnly style={inp} />
          </div>
        </div>
      </div>

      {/* Deduction Modal */}
      {showDeductionModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: "600px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Deduction Details (F2)</h3>
            <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
              <Field label="Unloading Date">
                <input type="date" value={saleFormData.deduction_details.unloading_date} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, unloading_date: e.target.value } }))} style={inp} />
              </Field>
              <Field label="Unloading Weight">
                <input type="number" value={saleFormData.deduction_details.unloading_weight} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, unloading_weight: e.target.value } }))} placeholder="Weight" style={inp} />
              </Field>
              <Field label="Moisture">
                <input type="number" value={saleFormData.deduction_details.moisture} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, moisture: e.target.value } }))} placeholder="Moisture" style={inp} />
              </Field>
              <Field label="Dunky">
                <input type="number" value={saleFormData.deduction_details.dunky} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, dunky: e.target.value } }))} placeholder="Dunky" style={inp} />
              </Field>
              <Field label="Fungus">
                <input type="number" value={saleFormData.deduction_details.fungus} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, fungus: e.target.value } }))} placeholder="Fungus" style={inp} />
              </Field>
              <Field label="Discolour">
                <input type="number" value={saleFormData.deduction_details.discolour} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, discolour: e.target.value } }))} placeholder="Discolour" style={inp} />
              </Field>
              <Field label="Others">
                <input type="number" value={saleFormData.deduction_details.others} onChange={(e) => setSaleFormData((prev) => ({ ...prev, deduction_details: { ...prev.deduction_details, others: e.target.value } }))} placeholder="Others" style={inp} />
              </Field>
              <div>
                <label style={lbl}>Total Deduction (Auto)</label>
                <input type="number" value={
                  parseFloat(saleFormData.deduction_details.moisture || 0) +
                  parseFloat(saleFormData.deduction_details.dunky || 0) +
                  parseFloat(saleFormData.deduction_details.fungus || 0) +
                  parseFloat(saleFormData.deduction_details.discolour || 0) +
                  parseFloat(saleFormData.deduction_details.others || 0)
                } readOnly style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowDeductionModal(false)} style={{ ...btnPrimary, background: "#64748b" }}>Close</button>
              <button type="button" onClick={() => {
                const total = parseFloat(saleFormData.deduction_details.moisture || 0) +
                  parseFloat(saleFormData.deduction_details.dunky || 0) +
                  parseFloat(saleFormData.deduction_details.fungus || 0) +
                  parseFloat(saleFormData.deduction_details.discolour || 0) +
                  parseFloat(saleFormData.deduction_details.others || 0);
                setSaleFormData((prev) => ({ ...prev, total_deduction: total }));
                setShowDeductionModal(false);
              }} style={btnPrimary}>Apply Deduction</button>
            </div>
          </div>
        </div>
      )}

      <div style={actionRow}>
        <button type="button" onClick={handleSaveSale} style={btnPrimary}>Save Sale Entry</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

const titleStyle = { margin: 0, fontSize: "18px", color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", maxWidth: "1200px", margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" };
const headerRow = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px", justifyContent: "space-between" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "start" };
const actionRow = { display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" };
const lbl = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#334155" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const tabBtn = { background: "#e2e8f0", border: "none", padding: "10px 18px", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: 600, fontSize: "14px", transition: "all 0.2s" };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = { border: "none", color: "#fff", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalContent = { background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "800px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" };
