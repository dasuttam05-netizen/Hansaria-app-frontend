import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission, loadSession } from "../utils/auth";
import PageBackCloseActions from "../components/PageBackCloseActions";

const defaultItems = [
  "KANTA",
  "JALPANI",
  "PARKING",
  "PALTI",
  "SAZAI",
  "LOADING",
  "UNLOADING",
  "NEW BAGS",
  "ADVANCE",
  "REFILLING",
  "KAMALI",
  "DALA",
  "SUTULI",
  "EXTRA",
  "VEHICLE FREIGHT",
  "BUSINESS TRAVEL",
  "HOTEL",
  "FOODING",
  "GODOWN RENT",
  "BIKE KM",
];

const WORK_DESCRIPTION_OPTIONS = [
  "Palti Lorry",
  "Self Loading",
  "Local Sale",
  "Warehouse Inward",
  "Warehouse Outward",
  "Others",
];

const calculateBalanceQty = (loading, unloading, shortage, excess) => {
  const total =
    (Number(loading) || 0) -
    (Number(unloading) || 0) -
    (Number(shortage) || 0) +
    (Number(excess) || 0);

  return Number(total.toFixed(2));
};

const createEmptyForm = (user) => ({
  expense_date: new Date().toISOString().slice(0, 10),
  location_id: "",
  employee_id: user?.id ? String(user.id) : "",
  product_id: "",
  company_id: "",
  company_account_id: "",
  reg_from_consignee_id: "",
  send_to_unified: "",
  reg_from_company_id: "",
  send_to_company_id: "",
  work_description: "",
  reg_lorry_no: "",
  loading: "",
  unloading: "",
  shortage: "",
  excess: "",
  balance: 0,
  new_lorry_no: "",
  new_weight: "",
  challan_weight: "",
  mb_no: "",
  paid_by: "",
  paid_by_mobile: "",
  status: "PENDING",
  receive_cash_from_party: "",
  receive_cash_from_driver: "",
  grand_total: 0,
  total_expense_amount: 0,
  narration: "",
  items: defaultItems.map((name, index) => ({
    line_no: index + 1,
    particular_name: name,
    bags: "",
    rate: "",
    amount: "",
  })),
});

export default function ExpenseManagementPage() {
  const API_BASE = "/api";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = loadSession();
  const canCreate = hasPermission(user, "expense.create");
  const canEdit = hasPermission(user, "expense.edit");
  const canDelete = hasPermission(user, "expense.delete");
  const canExpenseEntryAccess = hasPermission(user, "expense.entry") || hasPermission(user, "expense.view");
  const canOpenPalti = hasPermission(user, "expense.palti");
  const canOpenSelfLoading = hasPermission(user, "expense.selfLoading");
  const canOpenLocalSale = hasPermission(user, "expense.localSale");
  const canViewEmployees = hasPermission(user, "employees.view");
  const canViewCashEntries = hasPermission(user, "cash.view");
  const canApproveToCashBook = canEdit && hasPermission(user, "cash.create");
  const canAccessPage =
    canCreate || canEdit || canDelete || canExpenseEntryAccess;

  const [expenses, setExpenses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [consigneeNames, setConsigneeNames] = useState([]);
  const [approvedExpenseIds, setApprovedExpenseIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyForm(user));

  const filteredAccounts = useMemo(
    () =>
      companyAccounts.filter(
        (account) => Number(account.company_id) === Number(formData.company_id)
      ),
    [companyAccounts, formData.company_id]
  );

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    const editExpenseId = Number(searchParams.get("edit"));
    if (!Number.isFinite(editExpenseId) || editExpenseId <= 0) {
      return;
    }

    openExpenseById(editExpenseId);
  }, [searchParams]);

  const initializeData = async () => {
    await fetchDropdowns();
    await loadExpensesWithApprovals();
  };

  const loadExpensesWithApprovals = async () => {
    try {
      let approvedIds = [];
      if (canViewCashEntries) {
        const cashEntriesRes = await axios.get(`${API_BASE}/cash-entries?status=pending&entry_type=expense`);
        approvedIds = (cashEntriesRes.data || [])
          .filter((entry) => entry.source_expense_id)
          .map((entry) => entry.source_expense_id);
      }
      setApprovedExpenseIds(approvedIds);

      const expensesRes = await axios.get(`${API_BASE}/expenses?status=PENDING`);
      const allExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      const unapprovedExpenses = canViewCashEntries
        ? allExpenses.filter((e) => !approvedIds.includes(e.id))
        : allExpenses;
      setExpenses(unapprovedExpenses);
    } catch (error) {
      console.error("Failed to load expenses with approvals:", error);
      toast.error("Failed to load expenses", { theme: "colored" });
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [locationRes, warehouseRes, employeeRes, productRes, companyRes, accountRes, consigneeRes] =
        await Promise.all([
          axios.get(`${API_BASE}/locations`),
          axios.get(`${API_BASE}/warehouses`),
          canViewEmployees
            ? axios.get(`${API_BASE}/employees`)
            : Promise.resolve({
                data: user
                  ? [{ id: user.id, name: user.name || user.username || "Current User" }]
                  : [],
              }),
          axios.get(`${API_BASE}/products`),
          axios.get(`${API_BASE}/companies`),
          axios.get(`${API_BASE}/company-accounts`),
          axios.get(`${API_BASE}/consignee-names`).catch(() => ({ data: [] })),
        ]);

      const nextLocations = Array.isArray(locationRes.data) ? locationRes.data : [];
      const nextWarehouses = Array.isArray(warehouseRes.data) ? warehouseRes.data : [];
      setLocations(nextLocations);
      setWarehouses(nextWarehouses);
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : []);
      setProducts(productRes.data || []);
      setCompanies(companyRes.data || []);
      setCompanyAccounts(accountRes.data || []);
      setConsigneeNames(Array.isArray(consigneeRes.data) ? consigneeRes.data : []);

      if ((user?.assigned_warehouse_ids || []).length === 1) {
        const assignedWarehouse = nextWarehouses.find(
          (warehouse) => Number(warehouse.id) === Number(user.assigned_warehouse_ids[0])
        );
        if (assignedWarehouse?.location_id) {
          setFormData((prev) =>
            prev.location_id
              ? prev
              : { ...prev, location_id: String(assignedWarehouse.location_id) }
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load expense dropdowns", { theme: "colored" });
    }
  };

  const resetForm = () => {
    setFormData(createEmptyForm(user));
    setEditId(null);
    setShowForm(false);
  };

  const recalculateTotals = (items, receiveParty, receiveDriver) => {
    const grandTotal = items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const totalExpenseAmount =
      grandTotal - (Number(receiveParty) || 0) - (Number(receiveDriver) || 0);

    return {
      grand_total: Number(grandTotal.toFixed(2)),
      total_expense_amount: Number(totalExpenseAmount.toFixed(2)),
    };
  };

  const updateFormTotals = (nextItems, nextParty, nextDriver) => {
    const totals = recalculateTotals(nextItems, nextParty, nextDriver);
    setFormData((prev) => ({
      ...prev,
      items: nextItems,
      receive_cash_from_party: nextParty,
      receive_cash_from_driver: nextDriver,
      ...totals,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const nextItems = [...formData.items];
    nextItems[index] = {
      ...nextItems[index],
      [field]: value,
    };

    const bags = Number(nextItems[index].bags) || 0;
    const rate = Number(nextItems[index].rate) || 0;
    nextItems[index].amount = Number((bags * rate).toFixed(2));

    updateFormTotals(
      nextItems,
      formData.receive_cash_from_party,
      formData.receive_cash_from_driver
    );
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;

    if (name === "receive_cash_from_party" || name === "receive_cash_from_driver") {
      updateFormTotals(
        formData.items,
        name === "receive_cash_from_party" ? value : formData.receive_cash_from_party,
        name === "receive_cash_from_driver" ? value : formData.receive_cash_from_driver
      );
      return;
    }

    setFormData((prev) => {
      const nextBalance =
        ["loading", "unloading", "shortage", "excess"].includes(name)
          ? calculateBalanceQty(
              name === "loading" ? value : prev.loading,
              name === "unloading" ? value : prev.unloading,
              name === "shortage" ? value : prev.shortage,
              name === "excess" ? value : prev.excess
            )
          : prev.balance;

      const next = {
        ...prev,
        [name]: value,
        balance: nextBalance,
        ...(name === "company_id" ? { company_account_id: "" } : {}),
      };
      if (name === "reg_from_consignee_id" && value) {
        next.reg_from_company_id = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editId && !canEdit) {
      toast.error("You only have create access. Edit is not allowed.", { theme: "colored" });
      return;
    }

    if (!editId && !canCreate) {
      toast.error("Create is not allowed for this user.", { theme: "colored" });
      return;
    }

    if (!formData.expense_date || !formData.location_id) {
      toast.error("Expense date and location are required", { theme: "colored" });
      return;
    }

    if (!formData.work_description) {
      toast.error("Work Description is required", { theme: "colored" });
      return;
    }

    const u = (formData.send_to_unified || "").trim();
    let send_to_kind = null;
    let send_to_ref_id = null;
    if (u === "palti_lorry") {
      send_to_kind = "palti_lorry";
      send_to_ref_id = null;
    } else if (u.includes(":")) {
      const [k, idPart] = u.split(":");
      if (["consignee", "company", "warehouse"].includes(k) && idPart) {
        const n = Number(idPart);
        if (Number.isFinite(n)) {
          send_to_kind = k;
          send_to_ref_id = n;
        }
      }
    }

    const payload = {
      expense_date: formData.expense_date,
      location_id: Number(formData.location_id) || null,
      employee_id: Number(formData.employee_id) || null,
      product_id: Number(formData.product_id) || null,
      company_id: Number(formData.company_id) || null,
      company_account_id: Number(formData.company_account_id) || null,
      reg_from_consignee_id: Number(formData.reg_from_consignee_id) || null,
      reg_from_company_id: formData.reg_from_consignee_id
        ? null
        : Number(formData.reg_from_company_id) || null,
      send_to_kind,
      send_to_ref_id,
      send_to_party_id: null,
      send_to_company_id: null,
      work_description: formData.work_description,
      reg_lorry_no: formData.reg_lorry_no,
      loading: Number(formData.loading) || 0,
      unloading: Number(formData.unloading) || 0,
      shortage: Number(formData.shortage) || 0,
      excess: Number(formData.excess) || 0,
      shortage_excess:
        (Number(formData.shortage) || 0) - (Number(formData.excess) || 0),
      balance: Number(formData.balance) || 0,
      net_weight: 0,
      new_lorry_no: formData.new_lorry_no,
      new_weight: Number(formData.new_weight) || 0,
      challan_weight: Number(formData.challan_weight) || 0,
      mb_no: formData.mb_no,
      paid_by: formData.paid_by,
      paid_by_mobile: formData.paid_by_mobile,
      status: formData.status,
      receive_cash_from_party: Number(formData.receive_cash_from_party) || 0,
      receive_cash_from_driver: Number(formData.receive_cash_from_driver) || 0,
      grand_total: Number(formData.grand_total) || 0,
      total_expense_amount: Number(formData.total_expense_amount) || 0,
      narration: formData.narration,
      items: formData.items
        .filter((item) => item.particular_name)
        .map((item, index) => ({
          line_no: index + 1,
          particular_name: item.particular_name,
          bags: Number(item.bags) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        })),
    };

    try {
      if (editId) {
        await axios.put(`${API_BASE}/expenses/${editId}`, payload);
        toast.info("Expense updated successfully", { theme: "colored" });
      } else {
        await axios.post(`${API_BASE}/expenses`, payload);
        toast.success("Expense saved successfully", { theme: "colored" });
      }

      resetForm();
      loadExpensesWithApprovals();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to save expense", {
        theme: "colored",
      });
    }
  };

  const handleEdit = (row) => {
    if (!canEdit) {
      toast.error("You only have create access. Edit is not allowed.", { theme: "colored" });
      return;
    }
    setEditId(row.id);
    setFormData({
      expense_date: row.expense_date || new Date().toISOString().slice(0, 10),
      location_id: row.effective_location_id ? String(row.effective_location_id) : "",
      employee_id: row.employee_id ? String(row.employee_id) : "",
      product_id: row.product_id ? String(row.product_id) : "",
      company_id: row.company_id ? String(row.company_id) : "",
      company_account_id: row.company_account_id ? String(row.company_account_id) : "",
      reg_from_consignee_id: row.reg_from_consignee_id ? String(row.reg_from_consignee_id) : "",
      send_to_unified:
        row.send_to_kind === "palti_lorry"
          ? "palti_lorry"
          : row.send_to_kind && row.send_to_ref_id
          ? `${row.send_to_kind}:${row.send_to_ref_id}`
          : row.send_to_company_id && !row.send_to_kind
            ? `company:${row.send_to_company_id}`
            : "",
      reg_from_company_id:
        row.reg_from_consignee_id || !row.reg_from_company_id
          ? ""
          : String(row.reg_from_company_id),
      send_to_company_id: "",
      work_description: row.work_description || "",
      reg_lorry_no: row.reg_lorry_no || "",
      loading: row.loading || "",
      unloading: row.unloading || "",
      shortage: row.shortage || "",
      excess: row.excess || "",
      balance: Number(row.balance || 0),
      new_lorry_no: row.new_lorry_no || "",
      new_weight: row.new_weight || "",
      challan_weight: row.challan_weight || "",
      mb_no: row.mb_no || "",
      paid_by: row.paid_by || "",
      paid_by_mobile: row.paid_by_mobile || "",
      status: row.status || "PENDING",
      receive_cash_from_party: row.receive_cash_from_party || "",
      receive_cash_from_driver: row.receive_cash_from_driver || "",
      grand_total: Number(row.grand_total || 0),
      total_expense_amount: Number(row.total_expense_amount || 0),
      narration: row.narration || "",
      items:
        row.items?.length > 0
          ? row.items.map((item, index) => ({
              line_no: index + 1,
              particular_name: item.particular_name || "",
              bags: item.bags || "",
              rate: item.rate || "",
              amount: item.amount || "",
            }))
          : createEmptyForm(user).items,
    });
    setShowForm(true);
  };

  const openExpenseById = async (expenseId) => {
    if (!canEdit) {
      return;
    }

    const localMatch = expenses.find((row) => Number(row.id) === Number(expenseId));
    if (localMatch) {
      handleEdit(localMatch);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("edit");
        return next;
      }, { replace: true });
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/expenses/${expenseId}`);
      handleEdit(res.data);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to open expense entry", {
        theme: "colored",
      });
    } finally {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("edit");
        return next;
      }, { replace: true });
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error("Delete is not allowed for this user.", { theme: "colored" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this expense entry?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/expenses/${id}`);
      toast.warn("Expense deleted", { theme: "colored" });
      loadExpensesWithApprovals();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Delete failed", {
        theme: "colored",
      });
    }
  };

  const calculateAge = (expenseDate) => {
    const today = new Date();
    const expenseDateTime = new Date(expenseDate);
    const ageInMs = today - expenseDateTime;
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    return ageInDays;
  };

  const handleApproveForCashBook = async (expense) => {
    if (!canApproveToCashBook) {
      toast.error("Approve is not allowed for this user.", { theme: "colored" });
      return;
    }
    if (!window.confirm("Approve this expense and add to Cash Book?")) return;
    try {
      const res = await axios.post(`${API_BASE}/expenses/${expense.id}/approve-cash-book`);
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      setApprovedExpenseIds(prev => [...prev, expense.id]);
      toast.success(res?.data?.message || "Expense approved and moved to Cash Book pending list!", { theme: "colored" });
      await loadExpensesWithApprovals();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Approval failed", { theme: "colored" });
    }
  };

  return (
    <div style={pageStyle}>
      {!canAccessPage ? (
        <div style={{ ...listCardStyle, padding: "24px", textAlign: "center", color: "#64748b" }}>
          You do not have access to this page.
        </div>
      ) : (
        <>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar transition={Slide} />

      <div style={headerCardStyle}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Expense Entry</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            Add and manage warehouse expense entries
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowForm(true)}
            disabled={!canCreate}
            style={{
              ...primaryButtonStyle,
              background: canCreate ? "#0f766e" : "#94a3b8",
            }}
          >
            Add Expense Entry
          </button>
          <PageBackCloseActions navigate={navigate} />
        </div>
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <button onClick={resetForm} style={closeButtonStyle}>
              X
            </button>

            <h3 style={{ marginTop: 0, color: "#0f172a" }}>
              {editId ? "Edit Expense Entry" : "New Expense Entry"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={formGridStyle}>
                <Field label="Location">
                  <select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Employee">
                  <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date">
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    required
                  />
                </Field>

                <Field label="Product">
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Party (Company)">
                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="">Select company party</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Party Company / A/C">
                  <select
                    name="company_account_id"
                    value={formData.company_account_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="">Select Account</option>
                    {filteredAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Reg From (Consignee name)">
                  <select
                    name="reg_from_consignee_id"
                    value={formData.reg_from_consignee_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="">Select consignee name</option>
                    {consigneeNames.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.buyer_name ? `${c.name} (${c.buyer_name})` : c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Work Description">
                  <select
                    name="work_description"
                    value={formData.work_description}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select Work Description</option>
                    {WORK_DESCRIPTION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                {(["Palti Lorry", "Self Loading", "Local Sale"].includes(formData.work_description)) && (
                  <>
                    {["Self Loading", "Local Sale"].includes(formData.work_description) && (
                      <Field label="Party Name">
                        <select
                          name="company_id"
                          value={formData.company_id}
                          onChange={handleFieldChange}
                          style={inputStyle}
                        >
                          <option value="">Select Party</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    {["Palti Lorry", "Self Loading"].includes(formData.work_description) && (
                      <Field label="Palti Lorry">
                        <select
                          name="send_to_unified"
                          value={formData.send_to_unified}
                          onChange={handleFieldChange}
                          style={inputStyle}
                        >
                          <option value="">Select Palti Lorry</option>
                          <option value="palti_lorry">Palti Lorry</option>
                        </select>
                      </Field>
                    )}
                  </>
                )}

                {(["Warehouse Inward", "Warehouse Outward"].includes(formData.work_description)) && (
                  <Field label="Warehouse">
                    <select
                      name="send_to_unified"
                      value={formData.send_to_unified}
                      onChange={handleFieldChange}
                      style={inputStyle}
                    >
                      <option value="">Select Warehouse</option>
                      <optgroup label="Warehouse name">
                        {warehouses.map((w) => (
                          <option key={`wh-${w.id}`} value={`warehouse:${w.id}`}>
                            {w.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>
                )}

                {(formData.work_description === "Others") && (
                  <Field label="Send To">
                    <select
                      name="send_to_unified"
                      value={formData.send_to_unified}
                      onChange={handleFieldChange}
                      style={inputStyle}
                    >
                      <option value="">Select Send To</option>
                      <option value="palti_lorry">Palti Lorry</option>
                      <optgroup label="Consignee names">
                        {consigneeNames.map((c) => (
                          <option key={`cg-${c.id}`} value={`consignee:${c.id}`}>
                            {c.buyer_name ? `${c.name} (${c.buyer_name})` : c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Party (Company)">
                        {companies.map((co) => (
                          <option key={`co-${co.id}`} value={`company:${co.id}`}>
                            {co.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Warehouse name">
                        {warehouses.map((w) => (
                          <option key={`wh-${w.id}`} value={`warehouse:${w.id}`}>
                            {w.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>
                )}

                <Field label="Reject Lorry No">
                  <input
                    type="text"
                    name="reg_lorry_no"
                    value={formData.reg_lorry_no}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    placeholder="Reject Lorry No"
                  />
                </Field>

                <Field label="Loading">
                  <input
                    type="number"
                    name="loading"
                    value={formData.loading}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Unloading">
                  <input
                    type="number"
                    name="unloading"
                    value={formData.unloading}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Balance Qty">
                  <input
                    type="number"
                    name="balance"
                    value={formData.balance}
                    readOnly
                    style={{ ...inputStyle, background: "#f8fafc", fontWeight: 700 }}
                  />
                </Field>

                <Field label="Shortage">
                  <input
                    type="number"
                    name="shortage"
                    value={formData.shortage}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Excess">
                  <input
                    type="number"
                    name="excess"
                    value={formData.excess}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="New Lorry No">
                  <input
                    type="text"
                    name="new_lorry_no"
                    value={formData.new_lorry_no}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    placeholder="New Lorry No"
                  />
                </Field>

                <Field label="New Weight">
                  <input
                    type="number"
                    name="new_weight"
                    value={formData.new_weight}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Challan Weight">
                  <input
                    type="number"
                    name="challan_weight"
                    value={formData.challan_weight}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="MB No">
                  <input
                    type="text"
                    name="mb_no"
                    value={formData.mb_no}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    placeholder="MB No"
                  />
                </Field>

                <Field label="Paid By">
                  <input
                    type="text"
                    name="paid_by"
                    value={formData.paid_by}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    placeholder="Paid By Party / Driver"
                  />
                </Field>

                <Field label="Paid By Mobile">
                  <input
                    type="text"
                    name="paid_by_mobile"
                    value={formData.paid_by_mobile}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    placeholder="Mobile Number"
                  />
                </Field>

                <Field label="Status">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED_BY_BM">CONFIRMED BY BM</option>
                    <option value="CONFIRMED_BY_HO">CONFIRMED BY HO</option>
                  </select>
                </Field>
              </div>

              <div style={itemsCardStyle}>
                <div style={sectionTitleStyle}>Expense Particulars</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={compactHeadStyle}>#</th>
                        <th style={compactHeadStyle}>Particulars</th>
                        <th style={compactHeadStyle}>Bags</th>
                        <th style={compactHeadStyle}>Rate</th>
                        <th style={compactHeadStyle}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td style={compactIndexStyle}>{index + 1}</td>
                          <td style={compactCellStyle}>
                            <input
                              type="text"
                              value={item.particular_name}
                              onChange={(e) => handleItemChange(index, "particular_name", e.target.value)}
                              style={compactInputStyle}
                            />
                          </td>
                          <td style={compactCellStyle}>
                            <input
                              type="number"
                              value={item.bags}
                              onChange={(e) => handleItemChange(index, "bags", e.target.value)}
                              style={compactInputStyle}
                              placeholder="Bags"
                            />
                          </td>
                          <td style={compactCellStyle}>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                              style={compactInputStyle}
                              placeholder="Rate"
                            />
                          </td>
                          <td style={compactCellStyle}>
                            <input
                              type="number"
                              value={item.amount}
                              readOnly
                              style={{ ...compactInputStyle, background: "#ffffff", fontWeight: 400 }}
                              placeholder="Amount"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={formGridStyle}>
                <Field label="Receive Cash From Party">
                  <input
                    type="number"
                    name="receive_cash_from_party"
                    value={formData.receive_cash_from_party}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Receive Cash From Driver">
                  <input
                    type="number"
                    name="receive_cash_from_driver"
                    value={formData.receive_cash_from_driver}
                    onChange={handleFieldChange}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Grand Total">
                  <input
                    type="number"
                    name="grand_total"
                    value={formData.grand_total}
                    readOnly
                    style={{ ...inputStyle, background: "#f8fafc", fontWeight: 700 }}
                  />
                </Field>

                <Field label="Total Expense Amount">
                  <input
                    type="number"
                    name="total_expense_amount"
                    value={formData.total_expense_amount}
                    readOnly
                    style={{ ...inputStyle, background: "#f8fafc", fontWeight: 700 }}
                  />
                </Field>
              </div>

              <Field label="Narration">
                <textarea
                  name="narration"
                  value={formData.narration}
                  onChange={handleFieldChange}
                  style={{ ...inputStyle, minHeight: "78px", resize: "vertical" }}
                  placeholder="Narration"
                />
              </Field>

              <div style={actionBarStyle}>
                <button
                  type="submit"
                  disabled={editId ? !canEdit : !canCreate}
                  style={{
                    ...primaryButtonStyle,
                    background:
                      editId ? (canEdit ? "#0f766e" : "#94a3b8") : canCreate ? "#0f766e" : "#94a3b8",
                  }}
                >
                  Save
                </button>
                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={listCardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Voucher</th>
                <th style={tableHeadStyle}>Date</th>
                <th style={tableHeadStyle}>Age (Days)</th>
                <th style={tableHeadStyle}>Location</th>
                <th style={tableHeadStyle}>Employee</th>
                <th style={tableHeadStyle}>Product</th>
                <th style={tableHeadStyle}>Work Desc</th>
                <th style={tableHeadStyle}>Party (Co.)</th>
                <th style={tableHeadStyle}>Reg From</th>
                <th style={tableHeadStyle}>Send To</th>
                <th style={tableHeadStyle}>Reg Lorry</th>
                <th style={tableHeadStyle}>Paid By</th>
                <th style={tableHeadStyle}>Grand Total</th>
                <th style={tableHeadStyle}>Net Expense</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses
                  .filter(row => !approvedExpenseIds.includes(row.id))
                  .map((row, index) => {
                    const bgColor = index % 2 === 0 ? "#fff" : "#f8fafc";
                    return (
                      <tr key={row.id} style={{ background: bgColor }}>
                      <td style={tableCellStyle}>{row.voucher_no}</td>
                      <td style={tableCellStyle}>{formatDisplayDate(row.expense_date)}</td>
                      <td style={{ ...tableCellStyle, textAlign: "center", fontWeight: 600 }}>{calculateAge(row.expense_date)}</td>
                      <td style={tableCellStyle}>{row.location_name || row.warehouse_name || "-"}</td>
                      <td style={tableCellStyle}>{row.employee_name || "-"}</td>
                      <td style={tableCellStyle}>{row.product_name || "-"}</td>
                      <td style={tableCellStyle}>{row.work_description || "-"}</td>
                      <td style={tableCellStyle}>{row.company_name || "-"}</td>
                      <td style={tableCellStyle}>{row.reg_from_company_name || "-"}</td>
                      <td style={tableCellStyle}>{row.send_to_company_name || "-"}</td>
                      <td style={tableCellStyle}>{row.reg_lorry_no || "-"}</td>
                      <td style={tableCellStyle}>{row.paid_by || "-"}</td>
                      <td style={{ ...tableCellStyle, textAlign: "right" }}>
                        {Number(row.grand_total || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: "right", fontWeight: 700 }}>
                        {Number(row.total_expense_amount || 0).toFixed(2)}
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {canEdit ? (
                            <button
                              onClick={() => handleEdit(row)}
                              style={{ ...miniButtonStyle, background: "#2563eb" }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canApproveToCashBook ? (
                            <button
                              onClick={() => handleApproveForCashBook(row)}
                              style={{ ...miniButtonStyle, background: "#16a34a" }}
                            >
                              Approve
                            </button>
                          ) : null}
                          {(row.send_to_kind === "palti_lorry" || row.work_description === "Palti Lorry") && canOpenPalti ? (
                            <button
                              onClick={() => navigate("/palti-lorry")}
                              style={{ ...miniButtonStyle, background: "#7c3aed" }}
                            >
                              Palti Lorry
                            </button>
                          ) : null}
                          {row.work_description === "Self Loading" && canOpenSelfLoading ? (
                            <button
                              onClick={() => navigate("/self-loading")}
                              style={{ ...miniButtonStyle, background: "#ea580c" }}
                            >
                              Self Loading
                            </button>
                          ) : null}
                          {row.work_description === "Local Sale" && canOpenLocalSale ? (
                            <button
                              onClick={() => navigate("/local-sale")}
                              style={{ ...miniButtonStyle, background: "#f59e0b" }}
                            >
                              Local Sale
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              onClick={() => handleDelete(row.id)}
                              style={{ ...miniButtonStyle, background: "#dc2626" }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="15" style={{ ...tableCellStyle, textAlign: "center" }}>
                    No expense entries found
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

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const pageStyle = {
  padding: "20px",
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif",
};

const headerCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  padding: "18px 20px",
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const listCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const itemsCardStyle = {
  margin: "16px 0",
  border: "1px solid #dbe4ea",
  borderRadius: "14px",
  padding: "14px",
  background: "#ffffff",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: "18px",
  zIndex: 1100,
  overflowY: "auto",
};

const modalStyle = {
  width: "96%",
  maxWidth: "1250px",
  background: "#fff",
  borderRadius: "18px",
  padding: "22px",
  boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
  position: "relative",
  marginBottom: "20px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f172a",
};

const primaryButtonStyle = {
  border: "none",
  color: "#fff",
  borderRadius: "10px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle = {
  border: "none",
  color: "#fff",
  background: "#ef4444",
  borderRadius: "10px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle = {
  border: "none",
  color: "#fff",
  borderRadius: "8px",
  padding: "7px 11px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const tableHeadStyle = {
  padding: "10px 10px",
  border: "1px solid #dbe4ea",
  background: "#0f766e",
  color: "#fff",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "9px 10px",
  border: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const tableInputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "13px",
  outline: "none",
};

const compactHeadStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
  textAlign: "left",
  fontWeight: 700,
  fontSize: "13px",
};

const compactIndexStyle = {
  padding: "10px 10px",
  borderBottom: "1px solid #edf2f7",
  color: "#334155",
  width: "36px",
  verticalAlign: "middle",
};

const compactCellStyle = {
  padding: "6px 8px",
  borderBottom: "1px solid #edf2f7",
  verticalAlign: "middle",
};

const compactInputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d7dee7",
  borderRadius: "4px",
  fontSize: "13px",
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const sectionTitleStyle = {
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "10px",
};

const actionBarStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "16px",
};

const closeButtonStyle = {
  position: "absolute",
  top: "12px",
  right: "12px",
  border: "none",
  background: "#ef4444",
  color: "#fff",
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  cursor: "pointer",
  fontWeight: 700,
};
