import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CashEntryForm from "../components/CashEntryForm";
import PageBackCloseActions from "../components/PageBackCloseActions";

const API_BASE = "/api";

const emptyForm = () => ({
  voucher_no: "",
  entry_date: new Date().toISOString().split("T")[0],
  transaction_mode: "receipt",
  entry_type: "income",
  warehouse_id: "",
  company_id: "",
  company_account_id: "",
  description: "",
  amount: "",
  payment_method: "Cash",
  fund_source: "main_cash",
  journal_group_no: "",
  reference_no: "",
  narration: "",
  employee_id: "",
  journal_transfer_kind: "",
  journal_debit_name: "",
  journal_credit_name: "",
  status: "posted",
});

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
};

const pageStyle = {
  padding: 20,
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif",
};

export default function CashEntriesPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [agingRows, setAgingRows] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const [totals, setTotals] = useState({
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [warehousesRes, companiesRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/employees`),
      ]);

      setWarehouses(warehousesRes.data || []);
      setCompanies(companiesRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, []);

  useEffect(() => {
    const loadAging = async () => {
      if (!formData.company_id || !formData.entry_type) {
        setAgingRows([]);
        setAdjustments({});
        return;
      }
      try {
        const res = await axios.get(
          `${API_BASE}/cash-entries/aging/company/${formData.company_id}`,
          { params: { entry_type: formData.entry_type, source_entry_id: editingId || null } }
        );
        setAgingRows(res.data || []);
        if (!editingId) setAdjustments({});
      } catch (err) {
        console.error("Error loading aging:", err);
        setAgingRows([]);
      }
    };
    loadAging();
  }, [formData.company_id, formData.entry_type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
    setAgingRows([]);
    setAdjustments({});
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isJournal = formData.transaction_mode === "journal";

    if (
      !formData.entry_date ||
      !formData.entry_type ||
      !formData.description ||
      !formData.amount
    ) {
      alert("Please fill all required fields");
      return;
    }
    if (isJournal && (!formData.journal_debit_name || !formData.journal_credit_name)) {
      alert("Journal entry te Debit Name ar Credit Name duita din");
      return;
    }

    setFormLoading(true);

    try {
      const adjustmentRows = Object.entries(adjustments)
        .map(([target_entry_id, value]) => ({
          target_entry_id: Number(target_entry_id),
          adjusted_amount: Number(value || 0),
        }))
        .filter((item) => item.adjusted_amount > 0);

      if (editingId) {
        await axios.put(`${API_BASE}/cash-entries/${editingId}`, {
          ...formData,
          adjustments: adjustmentRows,
        });
      } else if (isJournal) {
        const parseJournalName = (value) => {
          const [kind, rawId] = String(value || "").split(":");
          const id = String(rawId || "").trim();
          if (!id) return { company_id: null, employee_id: null };
          if (kind === "party") return { company_id: id, employee_id: null };
          if (kind === "employee") return { company_id: null, employee_id: id };
          return { company_id: null, employee_id: null };
        };
        const debitTarget = parseJournalName(formData.journal_debit_name);
        const creditTarget = parseJournalName(formData.journal_credit_name);
        const isEmployeeTransfer = formData.journal_transfer_kind === "employee_to_employee";
        if (isEmployeeTransfer && (!debitTarget.employee_id || !creditTarget.employee_id)) {
          alert("Please select both debit and credit employees for an Employee to Employee transfer.");
          setFormLoading(false);
          return;
        }

        const journalGroupNo =
          String(formData.voucher_no || "").trim() ||
          `JV${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;

        const basePayload = {
          voucher_no: null,
          journal_group_no: journalGroupNo,
          transaction_mode: "journal",
          entry_date: formData.entry_date,
          warehouse_id: formData.warehouse_id || null,
          company_account_id: formData.company_account_id || null,
          amount: formData.amount,
          payment_method: formData.payment_method || "Cash",
          fund_source: formData.fund_source || "main_cash",
          reference_no: formData.reference_no || null,
          narration: formData.narration || null,
          employee_id: formData.employee_id || null,
          status: formData.status || "posted",
          adjustments: [],
        };

        const drPayload = {
          ...basePayload,
          entry_type: "expense",
          company_id: debitTarget.company_id || formData.company_id || null,
          employee_id: debitTarget.employee_id || null,
          description: `${formData.description} | Journal DR`,
        };
        const crPayload = {
          ...basePayload,
          entry_type: "income",
          company_id: creditTarget.company_id || formData.company_id || null,
          employee_id: creditTarget.employee_id || null,
          description: `${formData.description} | Journal CR`,
        };

        await axios.post(`${API_BASE}/cash-entries`, drPayload);
        await axios.post(`${API_BASE}/cash-entries`, crPayload);
      } else {
        const normalizedMode = String(formData.transaction_mode || "receipt").toLowerCase();
        const entryType =
          normalizedMode === "payment"
            ? "expense"
            : normalizedMode === "receipt"
            ? "income"
            : formData.entry_type;
        await axios.post(`${API_BASE}/cash-entries`, {
          ...formData,
          entry_type: entryType,
          voucher_no: formData.voucher_no || null,
          transaction_mode: formData.transaction_mode,
          adjustments: adjustmentRows,
        });
      }

      alert("Entry saved successfully!");
      resetForm();
      setShowForm(true); // Keep form open for next entry
    } catch (err) {
      alert("Error saving entry: " + (err.response?.data?.error || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: "#1e293b",
              fontWeight: 600,
            }}
          >
            New Cash Entry
          </h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Record cash income or expense
          </p>
        </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <CashEntryForm
          isOpen={showForm}
          onClose={closeForm}
          onSubmit={handleSubmit}
          formData={formData}
          onFormChange={handleFormChange}
          isEditMode={!!editingId}
          warehouses={warehouses}
          companies={companies}
          employees={employees}
          agingRows={agingRows}
          adjustments={adjustments}
          onAdjustmentChange={setAdjustments}
          loading={formLoading}
        />
      </div>
    </div>
  );
}
