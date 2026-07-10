import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

let expenseItemRowCounter = 0;
const nextExpenseItemRowKey = () => {
  expenseItemRowCounter += 1;
  return `expense-item-${expenseItemRowCounter}`;
};

const resolveExpenseParticularName = (item, fallbackName = "") => {
  const candidates = [item?.particular_name, item?.particulars, item?.name];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }

  return String(fallbackName ?? "").trim();
};

const createExpenseItem = (item = {}, fallbackLineNo = 1) => ({
  row_key: nextExpenseItemRowKey(),
  line_no: Number(item.line_no) || fallbackLineNo,
  particular_name: resolveExpenseParticularName(item, ""),
  bags: item.bags ?? "",
  rate: item.rate ?? "",
  amount:
    item.amount ??
    Number(((Number(item.bags) || 0) * (Number(item.rate) || 0)).toFixed(2)),
});

const normalizeExpenseItemsForForm = (items, user) => {
  const existingItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (existingItems.length === 0) {
    return createEmptyForm(user).items;
  }

  const unusedItems = [...existingItems];
  const rows = defaultItems.map((defaultName, index) => {
    const normalizedDefaultName = defaultName.trim().toLowerCase();
    let matchIndex = unusedItems.findIndex(
      (item) => Number(item.line_no) === index + 1
    );

    if (matchIndex === -1) {
      matchIndex = unusedItems.findIndex(
        (item) =>
          String(item.particular_name ?? item.particulars ?? item.name ?? "")
            .trim()
            .toLowerCase() === normalizedDefaultName
      );
    }

    const matchedItem =
      matchIndex >= 0 ? unusedItems.splice(matchIndex, 1)[0] : null;
    const resolvedName = resolveExpenseParticularName(matchedItem, defaultName);

    return createExpenseItem(
      {
        line_no: index + 1,
        particular_name: resolvedName || defaultName,
        bags: matchedItem?.bags ?? 0,
        rate: matchedItem?.rate ?? 0,
        amount:
          matchedItem?.amount ??
          Number(
            (
              (Number(matchedItem?.bags) || 0) *
              (Number(matchedItem?.rate) || 0)
            ).toFixed(2)
          ),
      },
      index + 1
    );
  });

  const extraRows = unusedItems.map((item, index) =>
    createExpenseItem(
      {
        ...item,
        particular_name: resolveExpenseParticularName(
          item,
          `Particular ${defaultItems.length + index + 1}`
        ),
      },
      defaultItems.length + index + 1
    )
  );

  return [...rows, ...extraRows];
};

const normalizeDecimalInput = (value) => {
  const raw = String(value ?? "");
  if (!raw) return "";

  const cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) {
    return cleaned;
  }

  return (
    cleaned.slice(0, dotIndex + 1) +
    cleaned.slice(dotIndex + 1).replace(/\./g, "")
  );
};

const asTextValue = (value) => String(value ?? "");

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

const getRecordId = (record) => {
  if (!record) return "";
  if (typeof record === "string" || typeof record === "number") return String(record);
  return String(record.id || record._id || "");
};

const sameId = (left, right) =>
  String(left || "") !== "" && String(left || "") === String(right || "");

const withSelectedRecord = (records, selectedId, selectedLabel, labelField = "name") => {
  const value = String(selectedId || "");
  if (!value || records.some((record) => sameId(getRecordId(record), value))) {
    return records;
  }

  return [
    {
      id: value,
      [labelField]: selectedLabel || "Selected value",
    },
    ...records,
  ];
};

const createEmptyForm = (user) => ({
  expense_date: new Date().toISOString().slice(0, 10),
  location_id: getRecordId(user?.location_id),
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
  items: defaultItems.map((name, index) =>
    createExpenseItem(
      {
        line_no: index + 1,
        particular_name: name,
      },
      index + 1
    )
  ),
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
  const isHoOrBm = ["ho", "bm"].includes(String(user?.role || "").trim().toLowerCase());
  const canApproveToCashBook = canEdit && (hasPermission(user, "cash.create") || isHoOrBm);
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
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyForm(user));
  const [editLabels, setEditLabels] = useState({});
  const activeEditRequestRef = useRef(0);

  const filteredAccounts = useMemo(
    () =>
      formData.company_id
        ? companyAccounts.filter((account) =>
            sameId(account.company_id, formData.company_id)
          )
        : companyAccounts,
    [companyAccounts, formData.company_id]
  );

  const accessibleLocations = useMemo(() => {
    const allowedIds = new Set(
      [
        getRecordId(user?.location_id),
        ...(Array.isArray(user?.location_ids) ? user.location_ids.map(getRecordId) : []),
      ].filter(Boolean)
    );

    if (!user || user.role === "admin" || hasPermission(user, "locations.manage") || allowedIds.size === 0) {
      return locations;
    }

    return locations.filter((location) => allowedIds.has(getRecordId(location)));
  }, [locations, user]);

  const filteredWarehouses = useMemo(() => {
    if (!formData.location_id) return warehouses;
    return warehouses.filter((warehouse) =>
      sameId(getRecordId(warehouse.location_id), formData.location_id)
    );
  }, [warehouses, formData.location_id]);

  const filteredEmployees = useMemo(() => {
    if (!formData.location_id) {
      return employees;
    }

    return employees.filter((employee) => {
      const employeeLocationIds = [
        getRecordId(employee.location_id),
        ...(Array.isArray(employee.location_ids) ? employee.location_ids.map(getRecordId) : []),
      ].filter(Boolean);

      return employeeLocationIds.some((locationId) =>
        sameId(locationId, formData.location_id)
      );
    });
  }, [employees, formData.location_id]);

  const locationOptions = useMemo(
    () => withSelectedRecord(accessibleLocations, formData.location_id, editLabels.location_name),
    [accessibleLocations, formData.location_id, editLabels.location_name]
  );

  const employeeOptions = useMemo(
    () => withSelectedRecord(filteredEmployees, formData.employee_id, editLabels.employee_name),
    [filteredEmployees, formData.employee_id, editLabels.employee_name]
  );

  const productOptions = useMemo(
    () => withSelectedRecord(products, formData.product_id, editLabels.product_name),
    [products, formData.product_id, editLabels.product_name]
  );

  const companyOptions = useMemo(
    () => withSelectedRecord(companies, formData.company_id, editLabels.company_name),
    [companies, formData.company_id, editLabels.company_name]
  );

  const accountOptions = useMemo(
    () => withSelectedRecord(filteredAccounts, formData.company_account_id, editLabels.company_account_name, "account_name"),
    [filteredAccounts, formData.company_account_id, editLabels.company_account_name]
  );

  const warehouseOptions = useMemo(() => {
    const selectedWarehouseId = String(formData.send_to_unified || "").startsWith("warehouse:")
      ? String(formData.send_to_unified).split(":")[1]
      : "";
    return withSelectedRecord(filteredWarehouses, selectedWarehouseId, editLabels.send_to_company_name);
  }, [filteredWarehouses, formData.send_to_unified, editLabels.send_to_company_name]);

  useEffect(() => {
    initializeData();
  }, []);

  const editParam = searchParams.get("edit");

  useEffect(() => {
    const editExpenseId = Number(editParam);
    if (!Number.isFinite(editExpenseId) || editExpenseId <= 0) {
      return;
    }

    openExpenseById(editExpenseId);
  }, [editParam]);

  const initializeData = async () => {
    await fetchDropdowns();
    await loadExpensesWithApprovals();
  };

  const loadExpensesWithApprovals = async () => {
    try {
      const [cashEntriesResult, expensesResult] = await Promise.allSettled([
        canViewCashEntries
          ? axios.get(`${API_BASE}/cash-entries?status=pending&entry_type=expense`)
          : Promise.resolve({ data: [] }),
        axios.get(`${API_BASE}/expenses?status=pending`),
      ]);

      const approvedIds =
        cashEntriesResult.status === "fulfilled"
          ? (cashEntriesResult.value.data || [])
              .filter((entry) => entry.source_expense_id)
              .map((entry) => entry.source_expense_id)
          : [];

      if (cashEntriesResult.status === "rejected") {
        console.warn("Failed to load pending cash entries for expense approvals:", cashEntriesResult.reason);
      }

      setApprovedExpenseIds(approvedIds);

      if (expensesResult.status === "rejected") {
        throw expensesResult.reason;
      }

      const expensesRes = expensesResult.value;
      const allExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      const unapprovedExpenses = canViewCashEntries
        ? allExpenses.filter((e) => !approvedIds.includes(e.id))
        : allExpenses;
      setExpenses(unapprovedExpenses);
      setSelectedExpenseId((currentId) =>
        currentId && unapprovedExpenses.some((expense) => String(expense.id) === String(currentId))
          ? currentId
          : unapprovedExpenses[0]?.id || null
      );
    } catch (error) {
      console.error("Failed to load expenses with approvals:", error);
      toast.error(
        error?.response?.data?.error || error?.message || "Failed to load expenses",
        { theme: "colored" }
      );
    }
  };

  const fetchDropdowns = async () => {
    const currentUserOption = user
      ? [{
          id: user.id,
          name: user.name || user.username || "Current User",
          location_id: user.location_id,
          location_ids: user.location_ids || [],
        }]
      : [];
    const dropdownRequests = [
      ["locations", axios.get(`${API_BASE}/locations`)],
      ["warehouses", axios.get(`${API_BASE}/warehouses`)],
      [
        "employees",
        canViewEmployees
          ? axios.get(`${API_BASE}/employees`)
          : Promise.resolve({ data: currentUserOption }),
      ],
      ["products", axios.get(`${API_BASE}/products`)],
      ["companies", axios.get(`${API_BASE}/companies`)],
      ["company accounts", axios.get(`${API_BASE}/company-accounts`)],
      ["consignee names", axios.get(`${API_BASE}/consignee-names`)],
    ];

    const settled = await Promise.allSettled(
      dropdownRequests.map(([, request]) => request)
    );

    const dataByName = dropdownRequests.reduce((acc, [name], index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        acc[name] = result.value?.data;
      } else {
        console.error(`Failed to load expense dropdown: ${name}`, result.reason);
        acc[name] = [];
      }
      return acc;
    }, {});

    const nextLocations = Array.isArray(dataByName.locations) ? dataByName.locations : [];
    const nextWarehouses = Array.isArray(dataByName.warehouses) ? dataByName.warehouses : [];
    const nextEmployees = Array.isArray(dataByName.employees) ? dataByName.employees : currentUserOption;

    try {
      setLocations(nextLocations);
      setWarehouses(nextWarehouses);
      setEmployees(nextEmployees);
      setProducts(Array.isArray(dataByName.products) ? dataByName.products : []);
      setCompanies(Array.isArray(dataByName.companies) ? dataByName.companies : []);
      setCompanyAccounts(Array.isArray(dataByName["company accounts"]) ? dataByName["company accounts"] : []);
      setConsigneeNames(Array.isArray(dataByName["consignee names"]) ? dataByName["consignee names"] : []);

      if ((user?.assigned_warehouse_ids || []).length === 1) {
        const assignedWarehouseId = String(user.assigned_warehouse_ids[0]);
        const assignedWarehouse = nextWarehouses.find(
          (warehouse) => getRecordId(warehouse) === assignedWarehouseId
        );
        const assignedLocationId = getRecordId(assignedWarehouse?.location_id);
        if (assignedLocationId) {
          setFormData((prev) =>
            prev.location_id
              ? prev
              : { ...prev, location_id: assignedLocationId }
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load expense dropdowns", { theme: "colored" });
    }
  };

  const resetForm = () => {
    activeEditRequestRef.current += 1;
    setFormData(createEmptyForm(user));
    setEditId(null);
    setEditLabels({});
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

  const handleItemChange = useCallback((rowKey, field, value) => {
    setFormData((prev) => {
      const normalizedValue =
        field === "bags" || field === "rate"
          ? normalizeDecimalInput(value)
          : value;
      const nextItems = prev.items.map((item) => {
        if (item.row_key !== rowKey) {
          return item;
        }

        const nextItem = {
          ...item,
          [field]: normalizedValue,
        };
        const bags = Number(nextItem.bags) || 0;
        const rate = Number(nextItem.rate) || 0;
        return {
          ...nextItem,
          amount: Number((bags * rate).toFixed(2)),
        };
      });

      const totals = recalculateTotals(
        nextItems,
        prev.receive_cash_from_party,
        prev.receive_cash_from_driver
      );

      return {
        ...prev,
        items: nextItems,
        ...totals,
      };
    });
  }, []);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;

    if (name === "receive_cash_from_party" || name === "receive_cash_from_driver") {
      setFormData((prev) => {
        const nextParty =
          name === "receive_cash_from_party" ? value : prev.receive_cash_from_party;
        const nextDriver =
          name === "receive_cash_from_driver" ? value : prev.receive_cash_from_driver;
        const totals = recalculateTotals(prev.items, nextParty, nextDriver);

        return {
          ...prev,
          receive_cash_from_party: nextParty,
          receive_cash_from_driver: nextDriver,
          ...totals,
        };
      });
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
        ...(name === "location_id" ? { employee_id: "", send_to_unified: "" } : {}),
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
        const n = String(idPart || "").trim();
        if (n) {
          send_to_kind = k;
          send_to_ref_id = n;
        }
      }
    }

    const payload = {
      expense_date: formData.expense_date,
      location_id: formData.location_id || null,
      employee_id: formData.employee_id || null,
      product_id: formData.product_id || null,
      company_id: formData.company_id || null,
      company_account_id: formData.company_account_id || null,
      reg_from_consignee_id: Number(formData.reg_from_consignee_id) || null,
      reg_from_company_id: formData.reg_from_consignee_id
        ? null
        : formData.reg_from_company_id || null,
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

  const populateEditForm = (row) => {
    const existingItems = Array.isArray(row.items) ? row.items : [];
    if (!canEdit && !canExpenseEntryAccess) {
      toast.error("You do not have access to view this expense.", { theme: "colored" });
      return;
    }
    setEditId(row.id);
    setEditLabels({
      location_name:
        row.location_name ||
        row.effective_location_name ||
        row.warehouse_location_name ||
        row.warehouse_name ||
        "",
      employee_name: row.employee_name || "",
      product_name: row.product_name || "",
      company_name: row.company_name || "",
      company_account_name: row.company_account_name || "",
      send_to_company_name: row.send_to_company_name || row.warehouse_name || "",
    });
    setFormData({
      expense_date: row.expense_date || new Date().toISOString().slice(0, 10),
      location_id: row.effective_location_id
        ? String(row.effective_location_id)
        : row.location_id
        ? String(row.location_id)
        : row.warehouse_location_id
        ? String(row.warehouse_location_id)
        : "",
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
      items: normalizeExpenseItemsForForm(existingItems, user),
    });
    setShowForm(true);
  };

  const openExpenseById = async (expenseId, clearEditParam = true) => {
    if (!canEdit && !canExpenseEntryAccess) {
      return;
    }

    const requestId = activeEditRequestRef.current + 1;
    activeEditRequestRef.current = requestId;

    try {
      const res = await axios.get(`${API_BASE}/expenses/${expenseId}`);
      if (requestId !== activeEditRequestRef.current) {
        return;
      }
      populateEditForm(res.data);
    } catch (error) {
      if (requestId !== activeEditRequestRef.current) {
        return;
      }
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to open expense entry", {
        theme: "colored",
      });
    } finally {
      if (clearEditParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("edit");
          return next;
        }, { replace: true });
      }
    }
  };

  const handleView = (row) => {
    if (!canEdit && !canExpenseEntryAccess) {
      toast.error("You do not have access to view this expense.", { theme: "colored" });
      return;
    }

    openExpenseById(row.id, false);
  };

  const calculateAge = (expenseDate) => {
    const today = new Date();
    const expenseDateTime = new Date(expenseDate);
    const ageInMs = today - expenseDateTime;
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    return ageInDays;
  };

  const pendingExpenses = useMemo(
    () => expenses.filter((row) => !approvedExpenseIds.includes(row.id)),
    [expenses, approvedExpenseIds]
  );

  const getExpenseWeightLabel = (row) => {
    const weight =
      Number(row.new_weight || 0) ||
      Number(row.balance || 0) ||
      Number(row.loading || 0) ||
      Number(row.challan_weight || 0);

    return weight ? `${Number(weight).toFixed(2)} MT` : "PENDING";
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
      setSelectedExpenseId((currentId) => (String(currentId) === String(expense.id) ? null : currentId));
      setApprovedExpenseIds(prev => [...prev, expense.id]);
      toast.success(res?.data?.message || "Expense approved and moved to Cash Book pending list!", { theme: "colored" });
      await loadExpensesWithApprovals();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Approval failed", { theme: "colored" });
    }
  };

  return (
    <div className="expense-page" style={pageStyle}>
      {!canAccessPage ? (
        <div style={{ ...listCardStyle, padding: "24px", textAlign: "center", color: "#64748b" }}>
          You do not have access to this page.
        </div>
      ) : (
        <>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar transition={Slide} />

      <div className="expense-header-card" style={headerCardStyle}>
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
        <div className="expense-form-overlay" style={overlayStyle}>
          <div className="expense-form-modal" style={modalStyle}>
            <button className="expense-form-close" onClick={resetForm} style={closeButtonStyle}>
              X
            </button>

            <h3 className="expense-form-title" style={{ marginTop: 0, color: "#0f172a" }}>
              {editId ? "View Expense Entry" : "New Expense Entry"}
            </h3>

            <form className="expense-entry-form" onSubmit={handleSubmit}>
              <div className="expense-form-grid" style={formGridStyle}>
                <Field label="Location">
                  <select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleFieldChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select location</option>
                    {locationOptions.map((location) => (
                      <option key={getRecordId(location)} value={getRecordId(location)}>
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
                    {employeeOptions.map((employee) => (
                      <option key={getRecordId(employee)} value={getRecordId(employee)}>
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

                {(canCreate || canEdit) && (
                  <>
                    <Field label="Product">
                      <select
                        name="product_id"
                        value={formData.product_id}
                        onChange={handleFieldChange}
                        style={inputStyle}
                      >
                        <option value="">Select Product</option>
                        {productOptions.map((product) => (
                          <option key={getRecordId(product)} value={getRecordId(product)}>
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
                        {companyOptions.map((company) => (
                          <option key={getRecordId(company)} value={getRecordId(company)}>
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
                        {accountOptions.map((account) => (
                          <option key={getRecordId(account)} value={getRecordId(account)}>
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
                  </>
                )}

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
                          {companyOptions.map((company) => (
                            <option key={getRecordId(company)} value={getRecordId(company)}>
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

                {(canCreate || canEdit) && (["Warehouse Inward", "Warehouse Outward"].includes(formData.work_description)) && (
                  <Field label="Warehouse">
                    <select
                      name="send_to_unified"
                      value={formData.send_to_unified}
                      onChange={handleFieldChange}
                      style={inputStyle}
                    >
                      <option value="">Select Warehouse</option>
                      <optgroup label="Warehouse name">
                        {warehouseOptions.map((w) => (
                          <option key={`wh-${getRecordId(w)}`} value={`warehouse:${getRecordId(w)}`}>
                            {w.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>
                )}

                {(canCreate || canEdit) && (formData.work_description === "Others") && (
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
                        {companyOptions.map((co) => (
                          <option key={`co-${getRecordId(co)}`} value={`company:${getRecordId(co)}`}>
                            {co.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Warehouse name">
                        {warehouseOptions.map((w) => (
                          <option key={`wh-${getRecordId(w)}`} value={`warehouse:${getRecordId(w)}`}>
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

              <div className="expense-items-card" style={itemsCardStyle}>
                <div className="expense-section-title" style={sectionTitleStyle}>Expense Particulars</div>
                <div className="expense-items-table-wrap" style={{ overflowX: "auto" }}>
                  <table className="expense-items-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
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
                        <ExpenseItemRow
                          key={item.row_key}
                          item={item}
                          index={index}
                          onItemChange={handleItemChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="expense-form-grid" style={formGridStyle}>
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

              <div className="expense-action-bar" style={actionBarStyle}>
                <button
                  type="submit"
                  disabled={editId ? !canEdit : !canCreate}
                  style={{
                    ...primaryButtonStyle,
                    background:
                      editId ? (canEdit ? "#0f766e" : "#94a3b8") : canCreate ? "#0f766e" : "#94a3b8",
                  }}
                >
                  {editId ? "Update" : "Save"}
                </button>
                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!showForm && (
      <div style={listCardStyle}>
        <div style={pendingHeaderStyle}>
          <div>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Approval</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Select an expense to view actions.</div>
          </div>
          <span style={pendingCountStyle}>{pendingExpenses.length}</span>
        </div>

        {pendingExpenses.length > 0 ? (
          <div style={expenseCardListStyle}>
            {pendingExpenses.map((row) => {
              const selected = String(selectedExpenseId || "") === String(row.id);
              const partyName = row.company_name || row.reg_from_company_name || row.send_to_company_name || "-";
              const lorryNo = row.reg_lorry_no || row.new_lorry_no || "-";

              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedExpenseId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedExpenseId(row.id);
                    }
                  }}
                  style={{
                    ...expenseCardStyle,
                    borderColor: selected ? "#93c5fd" : "#dbe4ea",
                    boxShadow: selected ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                    background: selected ? "#f8fbff" : "#f6f9fd",
                  }}
                >
                  <div style={expenseCardTopStyle}>
                    <div style={expenseVoucherStyle}>{row.voucher_no || `EXP${row.id}`}</div>
                    <span style={weightBadgeStyle}>{getExpenseWeightLabel(row)}</span>
                  </div>

                  <div style={expenseCardLineStyle}>
                    <strong>Date:</strong> {formatDisplayDate(row.expense_date) || "-"}
                  </div>
                  <div style={expenseCardLineStyle}>
                    <strong>Party:</strong> {partyName}
                  </div>
                  <div style={expenseCardLineStyle}>
                    <strong>Lorry No:</strong> {lorryNo}
                  </div>

                  {selected ? (
                    <div style={selectedPanelStyle}>
                      <div style={detailGridStyle}>
                        <div><strong>Age:</strong> {calculateAge(row.expense_date)} days</div>
                        <div><strong>Location:</strong> {row.location_name || row.warehouse_name || "-"}</div>
                        <div><strong>Employee:</strong> {row.employee_name || "-"}</div>
                        <div><strong>Product:</strong> {row.product_name || "-"}</div>
                        <div><strong>Work:</strong> {row.work_description || "-"}</div>
                        <div><strong>Paid By:</strong> {row.paid_by || "-"}</div>
                        <div><strong>Grand Total:</strong> {Number(row.grand_total || 0).toFixed(2)}</div>
                        <div><strong>Net Expense:</strong> {Number(row.total_expense_amount || 0).toFixed(2)}</div>
                      </div>

                      <div style={selectedActionStyle}>
                          {canEdit || canExpenseEntryAccess ? (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleView(row);
                              }}
                              style={{ ...miniButtonStyle, background: "#2563eb" }}
                            >
                              View
                            </button>
                          ) : null}
                          {canApproveToCashBook ? (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleApproveForCashBook(row);
                              }}
                              style={{ ...miniButtonStyle, background: "#16a34a" }}
                            >
                              Approve
                            </button>
                          ) : null}
                          {(row.send_to_kind === "palti_lorry" || row.work_description === "Palti Lorry") && canOpenPalti ? (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate("/palti-lorry");
                              }}
                              style={{ ...miniButtonStyle, background: "#7c3aed" }}
                            >
                              Palti Lorry
                            </button>
                          ) : null}
                          {row.work_description === "Self Loading" && canOpenSelfLoading ? (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate("/self-loading");
                              }}
                              style={{ ...miniButtonStyle, background: "#ea580c" }}
                            >
                              Self Loading
                            </button>
                          ) : null}
                          {row.work_description === "Local Sale" && canOpenLocalSale ? (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate("/local-sale");
                              }}
                              style={{ ...miniButtonStyle, background: "#f59e0b" }}
                            >
                              Local Sale
                            </button>
                          ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={emptyPendingStyle}>No expense entries found</div>
        )}
      </div>
      )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="expense-field">
      <label className="expense-field-label" style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const ExpenseItemRow = React.memo(function ExpenseItemRow({ item, index, onItemChange }) {
  return (
    <tr>
      <td className="expense-item-index" style={compactIndexStyle}>{index + 1}</td>
      <td className="expense-item-cell" style={compactCellStyle}>
        <input
          className="expense-item-input expense-item-particular"
          type="text"
          value={asTextValue(item.particular_name)}
          readOnly
          style={{ ...compactInputStyle, background: "#f8fafc", fontWeight: 700 }}
        />
      </td>
      <td className="expense-item-cell" style={compactCellStyle}>
        <input
          className="expense-item-input"
          type="text"
          inputMode="decimal"
          value={asTextValue(item.bags)}
          onChange={(e) => {
            const next = normalizeDecimalInput(e.target.value);
            onItemChange(item.row_key, "bags", next);
          }}
          style={compactInputStyle}
          placeholder="Bags"
        />
      </td>
      <td className="expense-item-cell" style={compactCellStyle}>
        <input
          className="expense-item-input"
          type="text"
          inputMode="decimal"
          value={asTextValue(item.rate)}
          onChange={(e) => {
            const next = normalizeDecimalInput(e.target.value);
            onItemChange(item.row_key, "rate", next);
          }}
          style={compactInputStyle}
          placeholder="Rate"
        />
      </td>
      <td className="expense-item-cell" style={compactCellStyle}>
        <input
          className="expense-item-input"
          type="number"
          value={item.amount}
          readOnly
          style={{ ...compactInputStyle, background: "#ffffff", fontWeight: 400 }}
          placeholder="Amount"
        />
      </td>
    </tr>
  );
});

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

const pendingHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "16px 16px 0",
  marginBottom: 14,
  flexWrap: "wrap",
};

const pendingCountStyle = {
  minWidth: 36,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 13,
};

const expenseCardListStyle = {
  display: "grid",
  gap: 10,
  padding: "0 16px 16px",
};

const expenseCardStyle = {
  border: "1px solid #dbe4ea",
  borderRadius: 8,
  padding: "14px 14px 12px",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
  outline: "none",
};

const expenseCardTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const expenseVoucherStyle = {
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 15,
};

const weightBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 20,
  padding: "3px 10px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const expenseCardLineStyle = {
  color: "#0f172a",
  fontSize: 12,
  lineHeight: 1.45,
};

const selectedPanelStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid #dbe4ea",
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "8px 14px",
  color: "#334155",
  fontSize: 12,
};

const selectedActionStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const emptyPendingStyle = {
  margin: "0 16px 16px",
  padding: "26px 12px",
  textAlign: "center",
  color: "#64748b",
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  background: "#f8fafc",
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
