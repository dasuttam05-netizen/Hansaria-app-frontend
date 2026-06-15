import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdjustmentPage from "./AdjustmentPage";
import OutwardSettlementPage from "./OutwardSettlementPage";
import BuyerAdjustmentListModal from "./BuyerAdjustmentListModal";
import BuyerAdjustmentSavedListModal from "./BuyerAdjustmentSavedListModal";
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

const getRecordId = (record) => {
  if (!record) return "";
  if (typeof record === "string" || typeof record === "number") return String(record);
  return String(record.id || record._id || "");
};

const sameId = (left, right) =>
  String(left || "") !== "" && String(left || "") === String(right || "");

const mobileCard = {
  border: "1px solid #bbf7d0",
  borderRadius: 14,
  background: "#ecfdf5",
  padding: 12,
  boxShadow: "0 8px 18px rgba(34, 197, 94, 0.08)",
};

const mobileCardTitle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 10,
};

const mobileCardBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
  color: "#1f3d05",
  background: "#d9f99d",
  whiteSpace: "nowrap",
};

const mobileRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
  borderTop: "1px solid #d9f99d",
};

const mobileLabel = {
  color: "#1f3d05",
  fontSize: 13,
  fontWeight: 800,
  flex: "0 0 42%",
};

const mobileValue = {
  color: "#14532d",
  fontSize: 14,
  fontWeight: 600,
  textAlign: "right",
  wordBreak: "break-word",
  flex: "1 1 auto",
};

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

export default function OutwardPage() {
  const API_BASE = "/api";
  const { user } = loadSession();

  const [outwards, setOutwards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedOutward, setSelectedOutward] = useState(null);
  const [selectedSettlementOutward, setSelectedSettlementOutward] = useState(null);
  const [hoveredOutwardId, setHoveredOutwardId] = useState(null);
  const [settlementRows, setSettlementRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filterView, setFilterView] = useState("all"); // all | pending | adjusted | settled
  const [showBuyerAdjustmentList, setShowBuyerAdjustmentList] = useState(false);
  const [showBuyerAdjustmentSavedList, setShowBuyerAdjustmentSavedList] = useState(false);
  const [selectedUnloadingOutward, setSelectedUnloadingOutward] = useState(null);
  const [selectedUnloadingDetails, setSelectedUnloadingDetails] = useState([]);
  const [selectedUnloadingLoading, setSelectedUnloadingLoading] = useState(false);
  const [selectedUnloadingError, setSelectedUnloadingError] = useState("");

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
    return consigneeNames.filter((c) => sameId(getRecordId(c.buyer_id), formData.buyer_id));
  }, [formData.buyer_id, consigneeNames]);
  const canCreate = hasPermission(user, "outward.create");
  const canEdit = hasPermission(user, "outward.edit");
  const canDelete = hasPermission(user, "outward.delete");
  const canAdjust = hasPermission(user, "adjustment.manage");
  const canViewEmployees = hasPermission(user, "employees.view");
  const canAccessPage =
    canCreate || canEdit || canDelete || canAdjust || hasPermission(user, "outward.view");
  const isSelfLoading = String(formData.self_loading || "No").trim().toLowerCase() === "yes";
  const requestedQty = Number(formData.weight) || 0;
  const availableStock = Number(warehouseStock.availableStock) || 0;
  const hasStockSelection = !isSelfLoading && Boolean(formData.warehouse_id && formData.product_id);
  const hasInsufficientStock = !isSelfLoading && hasStockSelection && requestedQty > 0 && requestedQty > availableStock;

  const openAdjustmentModal = (row) => {
    setSelectedSettlementOutward(null);
    setShowForm(false);
    setSelectedOutward(row || null);
  };

  const openSettlementModal = (row) => {
    setSelectedOutward(null);
    setShowForm(false);
    setSelectedSettlementOutward(row || null);
  };

  const closeAdjustmentModal = () => setSelectedOutward(null);
  const closeSettlementModal = () => setSelectedSettlementOutward(null);

  const fetchUnloadingDetails = async (outward) => {
    if (!outward || !outward.id) {
      setSelectedUnloadingDetails([]);
      setSelectedUnloadingError("");
      return;
    }

    setSelectedUnloadingLoading(true);
    setSelectedUnloadingError("");

    try {
      const res = await axios.get(`${API_BASE}/buyer-adjustment/${outward.id}`);
      setSelectedUnloadingDetails(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching unloading details:", err);
      setSelectedUnloadingDetails([]);
      setSelectedUnloadingError(err?.response?.data?.error || "Failed to fetch unloading details");
    } finally {
      setSelectedUnloadingLoading(false);
    }
  };

  const openUnloadingDetails = (row) => {
    setSelectedUnloadingOutward(row);
    fetchUnloadingDetails(row);
  };

  const openBuyerAdjustmentList = () => {
    setShowForm(false);
    setSelectedOutward(null);
    setSelectedSettlementOutward(null);
    setShowBuyerAdjustmentList(true);
  };
  const closeBuyerAdjustmentList = () => setShowBuyerAdjustmentList(false);

  const openBuyerAdjustmentSavedList = () => {
    setShowForm(false);
    setSelectedOutward(null);
    setSelectedSettlementOutward(null);
    setShowBuyerAdjustmentSavedList(true);
  };
  const closeBuyerAdjustmentSavedList = () => setShowBuyerAdjustmentSavedList(false);

  const handleSelectOutwardForBuyerAdjustment = (outward) => {
    setShowBuyerAdjustmentList(false);
    setShowBuyerAdjustmentSavedList(false);
    openUnloadingDetails(outward);
  };

  useEffect(() => {
    fetchDropdowns();
    fetchOutwards();
  }, []);

  useEffect(() => {
    const fetchSettlements = async () => {
      setSummaryLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/outward-settlement/report/list`);
        setSettlementRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setSettlementRows([]);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSettlements();
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
      const isMissingEmployeeData = !emp && assignedWarehouses.length === 0;

      setFormData((prev) => ({
        ...prev,
        location_id:
          isMissingEmployeeData && prev.location_id
            ? prev.location_id
            : warehouseLocationId || getRecordId(emp?.location_id) || prev.location_id,
        warehouse_id:
          currentWarehouseIsValid
            ? prev.warehouse_id
            : assignedWarehouses.length > 0
            ? getRecordId(assignedWarehouses[0])
            : prev.warehouse_id,
      }));
    }
  }, [formData.employee_id, employees, warehouses, editData]);

  // Filter warehouses by selected location
  const warehousesForLocation = formData.location_id
    ? warehouses.filter((w) => sameId(getRecordId(w.location_id), formData.location_id))
    : warehouses;

  const noWarehousesAvailable = formData.location_id && warehousesForLocation.length === 0;

  const totalSettlementsCount = useMemo(() => {
    // count unique outward_ids in settlement rows
    try {
      const ids = new Set((settlementRows || []).map((s) => String(s.outward_id)));
      return ids.size;
    } catch (e) {
      return (settlementRows || []).length;
    }
  }, [settlementRows]);

  const totalSettlementWeight = useMemo(() => {
    return (settlementRows || []).reduce((sum, r) => sum + (Number(r.settlement_weight || r.unloading_qty || 0) || 0), 0);
  }, [settlementRows]);

  const settledIds = useMemo(() => {
    try {
      return new Set((settlementRows || []).map((s) => String(s.outward_id)));
    } catch (e) {
      return new Set();
    }
  }, [settlementRows]);

  const adjustedCount = useMemo(() => {
    return outwards.filter((r) => {
      if (settledIds.has(String(r.id))) return false;
      const status = String(r.status || "").toLowerCase();
      return status === "partial" || status === "completed";
    }).length;
  }, [outwards, settledIds]);

  const pendingCount = useMemo(() => {
    return outwards.filter(
      (r) => !settledIds.has(String(r.id)) && (!r.status || String(r.status || "").toLowerCase() === "pending")
    ).length;
  }, [outwards, settledIds]);

  const filteredOutwards = useMemo(() => {
    if (filterView === "all") return outwards;
    if (filterView === "pending") return outwards.filter(
      (r) => !settledIds.has(String(r.id)) && (!r.status || String(r.status || "").toLowerCase() === "pending")
    );
    if (filterView === "adjusted") return outwards.filter((r) => {
      if (settledIds.has(String(r.id))) return false;
      const status = String(r.status || "").toLowerCase();
      return status === "partial" || status === "completed";
    });
    if (filterView === "settled") {
      return outwards.filter((r) => settledIds.has(String(r.id)));
    }
    return outwards;
  }, [outwards, filterView, settledIds]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "F2" && event.key !== "F5" && event.key !== "F6") return;
      event.preventDefault();
      event.stopPropagation();

      const targetRow =
        filteredOutwards.find((row) => String(row.id) === String(hoveredOutwardId)) ||
        filteredOutwards[0];

      if (event.key === "F2") {
        closeSettlementModal();
        closeFormModal();
        openBuyerAdjustmentList();
        return;
      }

      if (event.key === "F6") {
        closeSettlementModal();
        closeFormModal();
        openBuyerAdjustmentSavedList();
        return;
      }

      if (event.key === "F5") {
        if (targetRow) {
          closeAdjustmentModal();
          closeFormModal();
          openSettlementModal(targetRow);
          return;
        }

        if (showForm && editData) {
          closeAdjustmentModal();
          openSettlementModal(editData);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedOutward, selectedSettlementOutward, filteredOutwards, hoveredOutwardId, showForm, editData]);

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
      // refresh settlement summary as well
      try {
        const sres = await axios.get(`${API_BASE}/outward-settlement/report/list`);
        setSettlementRows(Array.isArray(sres.data) ? sres.data : []);
      } catch (e) {
        setSettlementRows([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching outwards", { theme: "colored" });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "buyer_id") {
      const b = buyerNames.find((x) => sameId(getRecordId(x), value));
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
      const c = consigneeNames.find((x) => sameId(getRecordId(x), value));
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

    if (name === "warehouse_id") {
      const selectedWarehouse = warehouses.find((item) => sameId(getRecordId(item), value));
      setFormData((prev) => ({
        ...prev,
        warehouse_id: value,
        location_id: getRecordId(selectedWarehouse?.location_id) || prev.location_id,
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
          ? getRecordId(user.assigned_warehouse_ids[0])
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
      self_loading: "No",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        employee_id: formData.employee_id || null,
        location_id: formData.location_id || null,
        warehouse_id: formData.warehouse_id || null,
        product_id: formData.product_id || null,
        company_id: formData.company_id || null,
        company_account_id: formData.company_account_id || null,
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
      buyer_id = getRecordId(consigneeRow.buyer_id);
      consignee_id = getRecordId(consigneeRow);
    } else {
      const buyerRow = buyerNames.find((b) => (b.name || "").trim() === bName);
      if (buyerRow) {
        buyer_id = getRecordId(buyerRow);
        const cg = consigneeNames.find(
          (c) => (c.name || "").trim() === cName && sameId(getRecordId(c.buyer_id), buyer_id)
        );
        if (cg) consignee_id = getRecordId(cg);
      }
    }
    // Ensure dropdown lists include the referenced items from this row
    const empId = getRecordId(row.employee_id);
    if (empId && !employees.some((e) => sameId(getRecordId(e), empId))) {
      setEmployees((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: empId, name: row.employee_name || `Employee ${empId}` },
      ]);
    }

    const locId = getRecordId(row.location_id);
    if (locId && !locations.some((l) => sameId(getRecordId(l), locId))) {
      setLocations((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: locId, name: row.location_name || `Location ${locId}` },
      ]);
    }

    const whId = getRecordId(row.warehouse_id);
    if (whId && !warehouses.some((w) => sameId(getRecordId(w), whId))) {
      setWarehouses((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: whId, name: row.warehouse_name || `Warehouse ${whId}`, location_id: locId || null },
      ]);
    }

    const prodId = getRecordId(row.product_id);
    if (prodId && !products.some((p) => sameId(getRecordId(p), prodId))) {
      setProducts((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: prodId, name: row.product_name || `Product ${prodId}` },
      ]);
    }

    const compId = getRecordId(row.company_id);
    if (compId && !companies.some((c) => sameId(getRecordId(c), compId))) {
      setCompanies((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: compId, name: row.company_name || `Company ${compId}` },
      ]);
    }

    const accId = getRecordId(row.company_account_id);
    if (accId && !companyAccounts.some((a) => sameId(getRecordId(a), accId))) {
      setCompanyAccounts((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: accId, account_name: row.party_name || row.account_name || `Account ${accId}`, company_id: compId || null },
      ]);
    }

    const bId = getRecordId(buyer_id);
    if (bId && !buyerNames.some((b) => sameId(getRecordId(b), bId))) {
      setBuyerNames((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: bId, name: row.buyer_name || `Buyer ${bId}` },
      ]);
    }

    const cId = getRecordId(consignee_id);
    if (cId && !consigneeNames.some((c) => sameId(getRecordId(c), cId))) {
      setConsigneeNames((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { id: cId, name: row.consignee_name || `Consignee ${cId}`, buyer_id: bId || null },
      ]);
    }
    setFormData({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      employee_id: getRecordId(row.employee_id) || "",
      location_id: getRecordId(row.location_id) || "",
      warehouse_id: getRecordId(row.warehouse_id) || "",
      product_id: getRecordId(row.product_id) || "",
      company_id: getRecordId(row.company_id) || "",
      company_account_id: getRecordId(row.company_account_id) || "",
      lorry_no: row.lorry_no || "",
      weight: row.weight || "",
      rate: row.rate || "",
      inv_no: row.inv_no || "",
      buyer_id: getRecordId(buyer_id) || "",
      buyer_name: row.buyer_name || "",
      consignee_id: getRecordId(consignee_id) || "",
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
          padding: "18px",
          marginBottom: "16px",
          background: "linear-gradient(90deg, #d8f1fb 0%, #eef6fb 50%, #fdfefe 100%)",
          border: "1px solid #9dd8fb",
          borderRadius: "20px",
          boxShadow: "0 16px 40px rgba(14, 165, 233, 0.12)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "96px",
                height: "32px",
                borderRadius: "999px",
                border: "1px solid rgba(14, 165, 233, 0.25)",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                marginBottom: "10px",
              }}
            >
              OUTWARD
            </div>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>
              Outward Management
            </h2>
            <p style={{ margin: "12px 0 0", color: "#475569", fontSize: "14px", maxWidth: "620px" }}>
              Manage outward records with quick summaries, adjustment actions, and settlement status in one clean dashboard.
            </p>
          </div>

          <div style={{ minWidth: "220px", flex: "1 1 220px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setEditData(null);
                resetForm();
                setShowForm(true);
              }}
              disabled={!canCreate}
              style={{
                ...btnStyle,
                background: canCreate ? "#0f766e" : "#94a3b8",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: "14px",
                fontSize: "13px",
                width: "auto",
                minWidth: "160px",
                boxShadow: canCreate ? "0 10px 20px rgba(16, 185, 129, 0.2)" : "none",
              }}
            >
              Add Outward
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "18px" }}>
          {[
            { title: "Total Entries", key: "all", value: outwards.length, note: "Loaded outward records" },
            { title: "All", key: "all", value: outwards.length, note: "Show all entries" },
            { title: "Pending", key: "pending", value: pendingCount, note: "Not adjusted" },
            { title: "Adjusted", key: "adjusted", value: adjustedCount, note: "Partial/completed" },
            { title: "Settled", key: "settled", value: totalSettlementsCount, note: `Settlement details • ${totalSettlementWeight.toFixed(2)} wt` },
          ].map((item) => {
            const isActive = filterView === item.key;
            return (
              <div
                key={item.title}
                onClick={() => setFilterView(item.key)}
                style={{
                  borderRadius: "18px",
                  border: isActive ? "1px solid #0ea5a4" : "1px solid rgba(15, 23, 42, 0.08)",
                  background: isActive ? "rgba(14, 165, 164, 0.08)" : "#fff",
                  padding: "18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "120px",
                  boxShadow: "0 10px 20px rgba(15, 23, 42, 0.04)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "30px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{item.value}</div>
                </div>
                <div style={{ fontSize: "12px", color: "#475569" }}>{item.note}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "12px", color: "#475569", fontSize: "13px" }}>
          Click any summary box above to show the matching outward details below.
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
                  {noWarehousesAvailable && !isSelfLoading && (
                    <div style={{ padding: "8px 12px", marginBottom: "8px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "6px", color: "#92400e", fontSize: "13px" }}>
                      ⚠️ No warehouse is mapped to the selected location. Please map a warehouse first or select a different location.
                    </div>
                  )}
                  <select 
                    name="warehouse_id" 
                    value={formData.warehouse_id} 
                    onChange={handleChange} 
                    disabled={isSelfLoading || noWarehousesAvailable} 
                    style={{ ...inp, background: isSelfLoading || noWarehousesAvailable ? "#f8fafc" : "#fff", borderColor: noWarehousesAvailable && !isSelfLoading ? "#ef4444" : "#cbd5e1" }}
                  >
                    <option value="">{isSelfLoading ? "Self Loading - Warehouse Not Required" : "Select Warehouse"}</option>
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
                    {formData.company_id && companyAccounts
                      .filter((acc) => sameId(getRecordId(acc.company_id), formData.company_id))
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
                      <option key={getRecordId(b)} value={getRecordId(b)}>
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
                      <option key={getRecordId(c)} value={getRecordId(c)}>
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
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>Outward Entries</h3>
            <div style={{ color: "#64748b", fontSize: "13px" }}>Use row actions to edit, copy, adjust, or settle records quickly.</div>
          </div>
        </div>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "78vh" }} className="ledger-desktop-table">
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
              {filteredOutwards.length > 0 ? (
                filteredOutwards.map((row, idx) => {
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
                    onClick={() => openUnloadingDetails(row)}
                    style={{ background: rowBg, transition: "background-color 0.15s ease", cursor: "pointer" }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(row);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(row.id);
                            }}
                            title="Delete"
                            aria-label="Delete"
                            style={{ ...actionBtnStyle, background: "#ef4444", color: "#fff", boxShadow: "0 10px 18px rgba(239, 68, 68, 0.26)" }}
                          >
                            <span style={actionIconStyle}>🗑</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(row);
                          }}
                          title="Copy"
                          aria-label="Copy"
                          style={{ ...actionBtnStyle, background: "#64748b", color: "#fff", boxShadow: "0 10px 18px rgba(100, 116, 139, 0.24)" }}
                        >
                          <span style={actionIconStyle}>⧉</span>
                        </button>
                        {canAdjust ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdjustmentModal(row);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              openSettlementModal(row);
                            }}
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

        <div className="ledger-mobile-view" style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {filteredOutwards.length > 0 ? (
            filteredOutwards.map((row, idx) => (
              <div key={row.id} style={{ ...mobileCard, cursor: "pointer" }} onClick={() => openUnloadingDetails(row)}>
                <div style={mobileCardTitle}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1f3d05" }}>
                      {row.sl_no != null ? row.sl_no : row.id} · {row.inv_no || "-"}
                    </div>
                    <div style={{ fontSize: 13, color: "#365314", marginTop: 2 }}>
                      {formatDate(row.date)} · {row.self_loading || "No"}
                    </div>
                  </div>
                  <span style={mobileCardBadge}>{row.lorry_no || "No Lorry"}</span>
                </div>

                {[
                  ["Employee", row.employee_name || "-"],
                  ["Location", row.location_name || "-"],
                  ["Warehouse", row.warehouse_name || "-"],
                  ["Product", row.product_name || "-"],
                  ["Company", row.company_name || "-"],
                  ["Account", row.party_name || "-"],
                  ["Weight", formatWeight(row.weight)],
                  ["Rate", formatRate(row.rate)],
                  ["Buyer", row.buyer_name || "-"],
                  ["Consignee", row.consignee_name || "-"],
                ].map(([labelText, value]) => (
                  <div key={labelText} style={mobileRow}>
                    <span style={mobileLabel}>{labelText}</span>
                    <span style={mobileValue}>{value}</span>
                  </div>
                ))}

                <div style={{ ...mobileRow, alignItems: "center" }}>
                  <span style={mobileLabel}>Actions</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                      >
                        Delete
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(row);
                      }}
                      style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                    >
                      Copy
                    </button>
                    {canAdjust ? (
                      <button
                        type="button"
                        onClick={() => openAdjustmentModal(row)}
                        style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                      >
                        Adjust
                      </button>
                    ) : null}
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openSettlementModal(row)}
                        style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                      >
                        Settle
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={mobileCard}>
              <div style={{ color: "#365314", textAlign: "center", fontWeight: 600 }}>No outward records found</div>
            </div>
          )}
        </div>

        {selectedUnloadingOutward && (
          <div style={{ ...cardStyle, margin: "16px 16px 0", padding: "16px 18px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Selected Outward: {selectedUnloadingOutward.sl_no != null ? selectedUnloadingOutward.sl_no : selectedUnloadingOutward.id} {selectedUnloadingOutward.inv_no ? `(${selectedUnloadingOutward.inv_no})` : ""}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>
                  {formatDate(selectedUnloadingOutward.date)} • {selectedUnloadingOutward.warehouse_name || selectedUnloadingOutward.location_name || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnloadingOutward(null)}
                style={{ ...btnPrimary, background: "#ef4444", minWidth: 120 }}
              >
                Close details
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
              {[
                ["Buyer", selectedUnloadingOutward.buyer_name || "—"],
                ["Consignee", selectedUnloadingOutward.consignee_name || "—"],
                ["Lorry No", selectedUnloadingOutward.lorry_no || "—"],
                ["Product", selectedUnloadingOutward.product_name || "—"],
                ["Warehouse", selectedUnloadingOutward.warehouse_name || selectedUnloadingOutward.location_name || "—"],
                ["Weight", formatWeight(selectedUnloadingOutward.weight)],
                ["Rate", formatRate(selectedUnloadingOutward.rate)],
                ["Status", selectedUnloadingOutward.status || "Pending"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f8fafc", border: "1px solid #dbeafe", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#14532d" }}>Unloading / Buyer Details</div>
                {selectedUnloadingLoading ? (
                  <div style={{ color: "#0ea5a4", fontWeight: 700 }}>Loading details...</div>
                ) : null}
              </div>
              {selectedUnloadingError ? (
                <div style={{ color: "#dc2626", padding: 12, background: "#fef2f2", borderRadius: 10 }}>{selectedUnloadingError}</div>
              ) : selectedUnloadingDetails.length === 0 && !selectedUnloadingLoading ? (
                <div style={{ color: "#475569", padding: 14, borderRadius: 10, background: "#f8fafc" }}>
                  No unloading details found for this entry.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, background: "#0f766e" }}>#</th>
                        <th style={thStyle}>Buyer</th>
                        <th style={thStyle}>Consignee</th>
                        <th style={thStyle}>Unloading Qty</th>
                        <th style={thStyle}>Rate</th>
                        <th style={thStyle}>Claim</th>
                        <th style={thStyle}>Deduction</th>
                        <th style={thStyle}>Shortage</th>
                        <th style={thStyle}>Shortage Amount</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUnloadingDetails.map((detail, index) => (
                        <tr key={`${detail.id || detail.outward_id}-${index}`}> 
                          <td style={tdStyle}>{index + 1}</td>
                          <td style={tdStyle}>{detail.buyer_name || "—"}</td>
                          <td style={tdStyle}>{detail.consignee_name || "—"}</td>
                          <td style={tdStyle}>{Number(detail.qty || detail.weight || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{Number(detail.rate || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{Number(detail.claim || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{Number(detail.other_deduction || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{Number(detail.shortage || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{Number(detail.shortage_amount || 0).toFixed(2)}</td>
                          <td style={tdStyle}>{detail.status || "Pending"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      {filterView !== "all" && (
        <div style={{ ...cardStyle, padding: 12, margin: "10px 16px 16px 16px", background: "#fff" }}>
          {filterView === "settled" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{totalSettlementsCount} settled</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{totalSettlementWeight.toFixed(2)} wt</div>
              </div>
              <div style={{ marginTop: 10 }}>
                {(settlementRows || []).length === 0 ? (
                  <div style={{ color: "#64748b" }}>No settlement records found</div>
                ) : (
                  (settlementRows || []).map((s) => (
                    <div key={s.id || `${s.outward_id}-${s.id}`} style={{ padding: "8px 0", borderBottom: "1px solid #eef2f6" }}>
                      <div style={{ fontWeight: 700 }}>{s.voucher_no || `Outward ${s.outward_id}`} — {formatDate(s.date)}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{s.company_name || ""} • {s.warehouse_name || ""} • {s.location_name || ""}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        Dispatch: {s.dispatch_qty || 0} | Unloading: {s.unloading_qty || 0} | Billable: {s.billable_qty || 0}
                      </div>
                      {Array.isArray(s.adjustment_details) && s.adjustment_details.length > 0 && (
                        <table style={{ width: "100%", marginTop: 8, fontSize: 12, borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #e6eef6" }}>#</th>
                              <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #e6eef6" }}>Source</th>
                              <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid #e6eef6" }}>Weight</th>
                              <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid #e6eef6" }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.adjustment_details.map((ad, i) => (
                              <tr key={i}>
                                <td style={{ padding: 6 }}>{i + 1}</td>
                                <td style={{ padding: 6 }}>{ad.source_type === "inward" ? (ad.inward_voucher_no || "Inward") : (ad.lorry_no || "Palti")}</td>
                                <td style={{ padding: 6, textAlign: "right" }}>{Number(ad.settlement_weight || 0)}</td>
                                <td style={{ padding: 6, textAlign: "right" }}>{Number(ad.amount || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {filterView === "adjusted" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{adjustedCount} adjusted</div>
              <div style={{ marginTop: 10 }}>
                {outwards.filter((r) => !settledIds.has(String(r.id)) && String(r.status || "").toLowerCase() === "partial").map((r) => (
                  <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #eef2f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.voucher_no || `Outward ${r.id}`} — {formatDate(r.date)}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{r.company_name || ""} • {r.warehouse_name || ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 13 }}>{formatWeight(r.weight)}</div>
                      <button type="button" onClick={() => openAdjustmentModal(r)} style={{ ...btnStyle, background: "#f59e0b", color: "#fff" }}>View Adjustment</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filterView === "pending" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{pendingCount} pending</div>
              <div style={{ marginTop: 10 }}>
                {outwards.filter((r) => !settledIds.has(String(r.id)) && (!r.status || String(r.status || "").toLowerCase() === "pending")).map((r) => (
                  <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #eef2f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.voucher_no || `Outward ${r.id}`} — {formatDate(r.date)}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{r.company_name || ""} • {r.warehouse_name || ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 13 }}>{formatWeight(r.weight)}</div>
                      <button type="button" onClick={() => openAdjustmentModal(r)} style={{ ...btnStyle, background: "#18b6d9", color: "#fff" }}>Adjust</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
            onClick={closeAdjustmentModal}
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

            <AdjustmentPage key={`adjust-${selectedOutward.id || selectedOutward.voucher_no || "row"}`} outward={selectedOutward} />
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
            onClick={closeSettlementModal}
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
              key={`settle-${selectedSettlementOutward.id || selectedSettlementOutward.voucher_no || "row"}`}
              outward={selectedSettlementOutward}
              onSaved={fetchOutwards}
            />
          </div>
        </div>
      )}

      <BuyerAdjustmentListModal
        isOpen={showBuyerAdjustmentList}
        onClose={closeBuyerAdjustmentList}
        onSelectOutward={handleSelectOutwardForBuyerAdjustment}
        buyerNames={buyerNames}
      />

      <BuyerAdjustmentSavedListModal
        isOpen={showBuyerAdjustmentSavedList}
        onClose={closeBuyerAdjustmentSavedList}
        onSelectOutward={handleSelectOutwardForBuyerAdjustment}
      />
      </>
      )}
    </div>
  );
}




















