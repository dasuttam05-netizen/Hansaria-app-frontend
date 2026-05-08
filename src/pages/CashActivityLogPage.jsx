import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const actionOptions = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
  { value: "cancel", label: "Cancel" },
  { value: "bulk_cancel", label: "Bulk Cancel" },
  { value: "status_change", label: "Status Change" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function CashActivityLogPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    from_date: "",
    to_date: "",
    limit: 200,
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/api/cash-entries/activity-logs", { params: filters });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to load activity logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const summary = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      const key = row.action || "unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [rows]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #d7e1ea", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a" }}>Cash Book Activity Logs</h2>
            <p style={{ marginTop: 8, color: "#475569" }}>
              Admin-only audit log for create, edit, delete and cancel actions.
            </p>
          </div>
          <PageBackCloseActions navigate={navigate} size="compact" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 14,
          }}
        >
          <select
            value={filters.action}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          <input
            type="number"
            min="10"
            max="1000"
            value={filters.limit}
            onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value) || 200 }))}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={fetchLogs}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Loading..." : "Refresh Logs"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, background: "#fff", border: "1px solid #d7e1ea", borderRadius: 16, padding: 16 }}>
        <div style={{ marginBottom: 10, color: "#0f172a", fontWeight: 700 }}>
          Total Logs: {rows.length}
        </div>
        <div style={{ marginBottom: 12, color: "#334155", fontSize: 13 }}>
          {Object.keys(summary).length === 0
            ? "No action summary"
            : Object.entries(summary)
                .map(([key, count]) => `${key}: ${count}`)
                .join(" | ")}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                {["Date Time", "Action", "Voucher", "Entry ID", "User", "Name", "Details"].map((head) => (
                  <th
                    key={head}
                    style={{
                      background: "#0f766e",
                      color: "#fff",
                      border: "1px solid #d5dee8",
                      padding: "10px 12px",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ border: "1px solid #e2e8f0", padding: 12 }}>
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{formatDateTime(row.created_at)}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{row.action || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{row.voucher_no || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{row.entry_id || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{row.actor_username || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>{row.actor_name || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 10 }}>
                      <pre
                        style={{
                          margin: 0,
                          fontSize: 12,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "#1e293b",
                        }}
                      >
                        {JSON.stringify(row.details || {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
