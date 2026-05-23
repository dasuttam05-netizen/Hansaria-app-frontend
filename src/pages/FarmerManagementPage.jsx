import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const emptyForm = () => ({
  name: "",
  mobile: "",
  email: "",
  address: "",
  pincode: "",
  state: "",
  district: "",
  city: "",
  room_floor_building: "",
  street_locality_landmark: "",
  gst_no: "",
  pan_no: "",
  aadhar_no: "",
  aadhaar_pan_link_status: "unknown",
  bank_name: "",
  bank_account_no: "",
  ifsc_code: "",
  branch_name: "",
  account_holder_name: "",
});

const compactUpper = (value) => String(value || "").replace(/\s/g, "").toUpperCase();
const compactDigits = (value) => String(value || "").replace(/\D/g, "");
const checkPan = (value) => {
  const pan = compactUpper(value);
  if (!pan) return { text: "PAN not entered", color: "#64748b" };
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
    ? { text: "PAN format OK", color: "#15803d" }
    : { text: "Invalid PAN format", color: "#dc2626" };
};
const checkAadhar = (value) => {
  const aadhar = compactDigits(value);
  if (!aadhar) return { text: "Aadhaar not entered", color: "#64748b" };
  return /^[0-9]{12}$/.test(aadhar)
    ? { text: "Aadhaar format OK", color: "#15803d" }
    : { text: "Aadhaar must be 12 digits", color: "#dc2626" };
};
const checkGst = (gstValue, panValue) => {
  const gst = compactUpper(gstValue);
  const pan = compactUpper(panValue);
  if (!gst) return { text: "GST not entered", color: "#64748b" };
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) {
    return { text: "Invalid GST format", color: "#dc2626" };
  }
  if (pan && gst.slice(2, 12) !== pan) {
    return { text: "GST PAN mismatch", color: "#dc2626" };
  }
  return { text: pan ? "GST valid, PAN matched" : "GST format OK", color: "#15803d" };
};
const checkIfsc = (value) => {
  const ifsc = compactUpper(value);
  if (!ifsc) return { text: "IFSC not entered", color: "#64748b" };
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    ? { text: "IFSC format OK", color: "#15803d" }
    : { text: "Invalid IFSC format", color: "#dc2626" };
};

export default function FarmerManagementPage() {
  const [farmers, setFarmers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [ifscLookupStatus, setIfscLookupStatus] = useState("");
  const [pinLookupStatus, setPinLookupStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  const importInputRef = useRef(null);
  const API_URL = "/api/farmers";

  const farmerImportHeaders = [
    "name",
    "mobile",
    "email",
    "gst_no",
    "pan_no",
    "aadhar_no",
    "aadhaar_pan_link_status",
    "state",
    "district",
    "city",
    "room_floor_building",
    "street_locality_landmark",
    "pincode",
    "address",
    "bank_name",
    "bank_account_no",
    "ifsc_code",
    "branch_name",
    "account_holder_name",
  ];

  const escapeCsvValue = (value) => {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const downloadTemplate = () => {
    const headerRow = farmerImportHeaders.join(",");
    const exampleRow = [
      "Example Farmer",
      "9123456789",
      "example@farm.com",
      "29ABCDE1234F1Z5",
      "ABCDE1234F",
      "123412341234",
      "linked",
      "Karnataka",
      "Bengaluru Urban",
      "Bengaluru",
      "Room 101, ABC Building",
      "MG Road, Near Landmark",
      "560048",
      "Example address line",
      "State Bank of India",
      "123456789012",
      "SBIN0001234",
      "MG Road Branch",
      "Example Farmer",
    ];
    const csvContent = [headerRow, exampleRow.map(escapeCsvValue).join(",")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "farmer-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += char;
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }

      if (char === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }

      if (char === "\r") {
        if (text[i + 1] === "\n") i += 1;
        row.push(field);
        if (row.length || field !== "") rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }

      if (char === "\n") {
        row.push(field);
        if (row.length || field !== "") rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }

      field += char;
      i += 1;
    }

    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((r) => r.length && !(r.length === 1 && r[0] === ""));
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportStatus("Importing...");
    setImportErrors([]);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length <= 1) {
        throw new Error("The file must contain a header row and at least one data row.");
      }
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const requiredHeaders = farmerImportHeaders;
      const missing = requiredHeaders.filter((field) => !headers.includes(field));
      if (missing.length) {
        throw new Error(`Missing headers: ${missing.join(", ")}`);
      }
      const matchedKeys = headers;
      const importRows = rows.slice(1).map((values, rowIndex) => {
        const row = {};
        matchedKeys.forEach((key, index) => {
          row[key] = values[index] || "";
        });
        return row;
      });

      const results = await Promise.allSettled(
        importRows.map((row, index) =>
          axios.post(API_URL, row).then(() => ({ rowNumber: index + 2, success: true })).catch((err) => {
            throw { rowNumber: index + 2, error: err };
          })
        )
      );

      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => {
          const rowNumber = result.reason?.rowNumber || "unknown";
          const message = result.reason?.error?.response?.data?.error || result.reason?.error?.message || result.reason?.message || "Import failed";
          return `Row ${rowNumber}: ${message}`;
        });

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failureCount = errors.length;
      setImportStatus(`Import completed: ${successCount} rows added, ${failureCount} errors.`);
      setImportErrors(errors);
      if (successCount) fetchFarmers();
    } catch (error) {
      const message = error?.message || "Import failed";
      setImportStatus(message);
      setImportErrors([message]);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const triggerImportFile = () => {
    importInputRef.current?.click();
  };

  const fetchFarmers = async () => {
    try {
      const res = await axios.get(API_URL);
      setFarmers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch farmers");
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  useEffect(() => {
    const ifsc = compactUpper(formData.ifsc_code);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setIfscLookupStatus(ifsc ? "Enter valid IFSC to auto fill bank details" : "");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIfscLookupStatus("Checking IFSC...");
        const res = await axios.get(`${API_URL}/lookup/ifsc/${ifsc}`);
        const data = res.data || {};
        setFormData((prev) => ({
          ...prev,
          bank_name: data.bank_name || prev.bank_name,
          branch_name: data.branch_name || prev.branch_name,
        }));
        setIfscLookupStatus("IFSC found, bank details filled");
      } catch (error) {
        setIfscLookupStatus("IFSC lookup failed");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.ifsc_code]);

  useEffect(() => {
    const pin = compactDigits(formData.pincode);
    if (!pin) {
      setPinLookupStatus("");
      return;
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      setPinLookupStatus("PIN No. must be 6 digits");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPinLookupStatus("Checking PIN...");
        const res = await axios.get(`${API_URL}/lookup/pincode/${pin}`);
        const data = res.data || {};
        setFormData((prev) => ({
          ...prev,
          state: data.state || prev.state,
          district: data.district || prev.district || "",
          city: data.city || prev.city || "",
        }));
        setPinLookupStatus("PIN found, district, city and state filled");
      } catch (error) {
        setPinLookupStatus("PIN lookup failed");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.pincode]);

  const fillFromPin = async () => {
    const pin = compactDigits(formData.pincode);
    if (!/^[0-9]{6}$/.test(pin)) {
      setPinLookupStatus("PIN No. must be 6 digits");
      return;
    }

    try {
      setPinLookupStatus("Checking PIN...");
      const res = await axios.get(`${API_URL}/lookup/pincode/${pin}`);
      const data = res.data || {};
      setFormData((prev) => ({
        ...prev,
        state: data.state || prev.state,
        district: data.district || prev.district || "",
        city: data.city || prev.city || "",
      }));
      setPinLookupStatus("PIN found, district, city and state filled");
    } catch (error) {
      setPinLookupStatus(error?.response?.data?.error || "PIN lookup failed");
    }
  };

  const fillFromIfsc = async () => {
    const ifsc = compactUpper(formData.ifsc_code);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setIfscLookupStatus("Enter valid IFSC to auto fill bank details");
      return;
    }

    try {
      setIfscLookupStatus("Checking IFSC...");
      const res = await axios.get(`${API_URL}/lookup/ifsc/${ifsc}`);
      const data = res.data || {};
      setFormData((prev) => ({
        ...prev,
        bank_name: data.bank_name || prev.bank_name,
        branch_name: data.branch_name || prev.branch_name,
      }));
      setIfscLookupStatus("IFSC found, bank details filled");
    } catch (error) {
      setIfscLookupStatus(error?.response?.data?.error || "IFSC lookup failed");
    }
  };

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "pan_no" || name === "gst_no" || name === "ifsc_code") value = compactUpper(value);
    if (name === "aadhar_no" || name === "bank_account_no" || name === "pincode") value = compactDigits(value);
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if ((name === "bank_account_no" || name === "name") && next.bank_account_no && !next.account_holder_name) {
        next.account_holder_name = next.name;
      }
      return next;
    });
    // Auto-trigger PIN lookup when user has entered 6 digits
    if (name === "pincode") {
      const pinDigits = String(value || "").replace(/\D/g, "");
      if (pinDigits.length === 6) {
        // small delay to let state update
        setTimeout(() => {
          try {
            fillFromPin();
          } catch (e) {
            /* ignore */
          }
        }, 120);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.pincode) {
      alert("Farmer Name, Mobile No. and PIN No. are required");
      return;
    }
    if (!/^[0-9]{6}$/.test(compactDigits(formData.pincode))) {
      alert("PIN No. must be 6 digits");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Farmer updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Farmer added successfully");
      }
      resetForm();
      fetchFarmers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving farmer");
    }
  };

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name || "",
      mobile: farmer.mobile || "",
      email: farmer.email || "",
      address: farmer.address || "",
      pincode: farmer.pincode || "",
      state: farmer.state || "",
      district: farmer.district || "",
      city: farmer.city || "",
      room_floor_building: farmer.room_floor_building || "",
      street_locality_landmark: farmer.street_locality_landmark || "",
      gst_no: farmer.gst_no || "",
      pan_no: farmer.pan_no || "",
      aadhar_no: farmer.aadhar_no || "",
      aadhaar_pan_link_status: farmer.aadhaar_pan_link_status || "unknown",
      bank_name: farmer.bank_name || "",
      bank_account_no: farmer.bank_account_no || "",
      ifsc_code: farmer.ifsc_code || "",
      branch_name: farmer.branch_name || "",
      account_holder_name: farmer.account_holder_name || "",
    });
    setEditId(farmer._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this farmer?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchFarmers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting farmer");
    }
  };

  const openAadhaarPanCheck = () => {
    window.open("https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status", "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>{editId ? "Edit Farmer" : "Add Farmer"}</h2>
            <button type="button" onClick={resetForm} style={btnPrimary}>Back To Farmer List</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <Field label="Farmer Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Farmer Name *" style={inp} />
              </Field>
              <Field label="Mobile">
                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile No. *" style={inp} />
              </Field>
              <Field label="Email">
                <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" style={inp} />
              </Field>
              <Field label="Gst No">
                <input name="gst_no" value={formData.gst_no} onChange={handleChange} placeholder="GST No." style={inp} />
                <StatusBadge status={checkGst(formData.gst_no, formData.pan_no)} />
              </Field>
              <Field label="Pan No">
                <input name="pan_no" value={formData.pan_no} onChange={handleChange} placeholder="PAN No." style={inp} />
                <StatusBadge status={checkPan(formData.pan_no)} />
              </Field>
              <Field label="Aadhaar No">
                <input name="aadhar_no" value={formData.aadhar_no} onChange={handleChange} placeholder="12 digit Aadhaar No." maxLength={12} style={inp} />
                <StatusBadge status={checkAadhar(formData.aadhar_no)} />
              </Field>
              <Field label="Aadhaar PAN Link">
                <div style={inlineFieldRow}>
                  <select name="aadhaar_pan_link_status" value={formData.aadhaar_pan_link_status} onChange={handleChange} style={inp}>
                    <option value="unknown">Not Checked</option>
                    <option value="linked">Linked</option>
                    <option value="not_linked">Not Linked</option>
                  </select>
                  <button type="button" onClick={openAadhaarPanCheck} style={miniUtilityBtn}>Check</button>
                </div>
              </Field>
              <Field label="State">
                <input name="state" value={formData.state} onChange={handleChange} placeholder="State" style={inp} />
              </Field>
              <Field label="PIN No">
                <div style={inlineFieldRow}>
                  <input name="pincode" value={formData.pincode} onChange={handleChange} onBlur={() => { if (/^[0-9]{6}$/.test(String(formData.pincode || ""))) fillFromPin(); }} placeholder="6 digit PIN No. *" maxLength={6} style={inp} />
                  <button type="button" onClick={fillFromPin} style={miniUtilityBtn}>Fill</button>
                </div>
                {pinLookupStatus ? <div style={helperText}>{pinLookupStatus}</div> : null}
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
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} style={{ ...inp, minHeight: 72, resize: "vertical" }} />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1", ...sectionTitle }}>Bank Details</div>
              <Field label="Account Holder Name">
                <input name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} placeholder="Account Holder Name" style={inp} />
              </Field>
              <Field label="Bank Name">
                <input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="Bank Name" style={inp} />
              </Field>
              <Field label="Account No">
                <input name="bank_account_no" value={formData.bank_account_no} onChange={handleChange} placeholder="Bank Account No." style={inp} />
                <div style={helperText}>Account holder auto fills from farmer name.</div>
              </Field>
              <Field label="IFSC Code">
                <div style={inlineFieldRow}>
                  <input name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} placeholder="IFSC Code" style={inp} />
                  <button type="button" onClick={fillFromIfsc} style={miniUtilityBtn}>Fill</button>
                </div>
                <StatusBadge status={checkIfsc(formData.ifsc_code)} />
                {ifscLookupStatus ? <div style={helperText}>{ifscLookupStatus}</div> : null}
              </Field>
              <Field label="Branch Name">
                <input name="branch_name" value={formData.branch_name} onChange={handleChange} placeholder="Branch Name" style={inp} />
              </Field>
            </div>
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>Save</button>
              <button type="button" onClick={resetForm} style={btnPrimary}>Back To Farmer List</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: 10, flexWrap: "wrap" }}>
            <h2 style={titleStyle}>Farmer Master</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={downloadTemplate} style={{ ...btnPrimary, background: "#0f766e" }}>Download Farmer Excel Template</button>
              <button type="button" onClick={triggerImportFile} style={{ ...btnPrimary, background: "#10b981" }}>Import Farmer Excel</button>
              <button type="button" onClick={() => setShowForm(true)} style={{ ...btnPrimary, background: "#2563eb" }}>Add Farmer</button>
            </div>
          </div>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFileChange} style={{ display: "none" }} />
          {importStatus ? <div style={{ marginBottom: 12, color: "#334155", fontWeight: 600 }}>{importStatus}</div> : null}
          {importErrors.length ? (
            <div style={{ marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
              {importErrors.map((error, idx) => (
                <div key={idx}>{error}</div>
              ))}
            </div>
          ) : null}
          <div style={tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f766e", color: "#fff" }}>
                  <th style={th}>ID</th>
                  <th style={th}>Farmer Name</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>District</th>
                  <th style={th}>City</th>
                  <th style={th}>PIN No.</th>
                  <th style={th}>State</th>
                  <th style={th}>GST No.</th>
                  <th style={th}>PAN No.</th>
                  <th style={th}>Aadhaar No.</th>
                  <th style={th}>Aadhaar PAN</th>
                  <th style={th}>Bank</th>
                  <th style={th}>Account No.</th>
                  <th style={th}>IFSC</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer, i) => (
                  <tr key={farmer._id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={td}>{farmer.name || "-"}</td>
                    <td style={td}>{farmer.mobile || "-"}</td>
                    <td style={td}>{farmer.district || "-"}</td>
                    <td style={td}>{farmer.city || "-"}</td>
                    <td style={td}>{farmer.pincode || "-"}</td>
                    <td style={td}>{farmer.state || "-"}</td>
                    <td style={td}>{farmer.gst_no || "-"}</td>
                    <td style={td}>{farmer.pan_no || "-"}</td>
                    <td style={td}>{farmer.aadhar_no || "-"}</td>
                    <td style={td}>{formatLinkStatus(farmer.aadhaar_pan_link_status)}</td>
                    <td style={td}>{farmer.bank_name || "-"}</td>
                    <td style={td}>{farmer.bank_account_no || "-"}</td>
                    <td style={td}>{farmer.ifsc_code || "-"}</td>
                    <td style={td}>
                      <button type="button" onClick={() => handleEdit(farmer)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                      <button type="button" onClick={() => handleDelete(farmer._id)} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {farmers.length === 0 ? (
                  <tr><td colSpan={15} style={{ ...td, textAlign: "center", padding: "20px" }}>No farmers found.</td></tr>
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

function StatusBadge({ status }) {
  return <div style={{ ...statusBadge, color: status.color }}>{status.text}</div>;
}

function formatLinkStatus(value) {
  if (value === "linked") return "Linked";
  if (value === "not_linked") return "Not Linked";
  return "Not Checked";
}

const titleStyle = { margin: 0, fontSize: "18px", color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", maxWidth: "1000px", margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" };
const headerRow = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px", justifyContent: "space-between" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "start" };
const actionRow = { display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" };
const lbl = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#334155" };
const statusBadge = { marginTop: 5, fontSize: 12, fontWeight: 700 };
const helperText = { marginTop: 5, fontSize: 12, color: "#64748b" };
const inlineFieldRow = { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" };
const miniUtilityBtn = { border: "none", background: "#0f766e", color: "#fff", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 700 };
const sectionTitle = { padding: "10px 12px", background: "#eef6f5", color: "#0f766e", fontWeight: 800, borderRadius: 8, border: "1px solid #cfe8e4" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = { border: "none", color: "#fff", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
