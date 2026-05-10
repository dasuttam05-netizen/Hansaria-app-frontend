import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "/api/companies";

const emptyForm = () => ({
  name: "",
  address: "",
  mobile: "",
  opening_balance: "0",
  opening_balance_type: "dr",
});

export default function CompanyManagementPage() {

  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [editId, setEditId] = useState(null);

  // ================= FETCH =================
  const fetchCompanies = async () => {

    try {

      const res = await axios.get(API_URL);

      const normalized = Array.isArray(res.data)
        ? res.data.map((item) => ({
            ...item,
            id: item._id || item.id,
          }))
        : [];

      setCompanies(normalized);

    } catch (err) {

      console.error(err);

      alert("Failed to fetch companies");
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // ================= INPUT =================
  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ================= RESET =================
  const resetForm = () => {

    setFormData(emptyForm());

    setEditId(null);

    setShowForm(false);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!formData.name || !formData.mobile) {

      alert("Company Name and Mobile required");

      return;
    }

    const payload = {

      ...formData,

      opening_balance:
        Number(formData.opening_balance ?? 0),

      opening_balance_type:
        String(
          formData.opening_balance_type || "dr"
        ).toLowerCase() === "cr"
          ? "cr"
          : "dr",
    };

    try {

      if (editId) {

        await axios.put(
          `${API_URL}/${editId}`,
          payload
        );

        alert("Company updated");

      } else {

        await axios.post(
          API_URL,
          payload
        );

        alert("Company added");
      }

      resetForm();

      fetchCompanies();

    } catch (err) {

      console.error(err);

      alert(
        err?.response?.data?.error ||
        "Error saving company"
      );
    }
  };

  // ================= EDIT =================
  const handleEdit = (comp) => {

    setFormData({

      name: comp.name || "",

      address: comp.address || "",

      mobile: comp.mobile || "",

      opening_balance:
        String(comp.opening_balance ?? 0),

      opening_balance_type:
        comp.opening_balance_type || "dr",
    });

    setEditId(comp.id);

    setShowForm(true);
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {

    if (!window.confirm("Delete company?")) {
      return;
    }

    try {

      await axios.delete(
        `${API_URL}/${id}`
      );

      fetchCompanies();

    } catch (err) {

      console.error(err);

      alert(
        err?.response?.data?.error ||
        "Delete failed"
      );
    }
  };

  return (

    <div style={pageStyle}>

      {showForm ? (

        <div style={card}>

          <div style={topBar}>

            <h2 style={title}>
              {editId
                ? "Edit Company"
                : "Add Company"}
            </h2>

            <button
              onClick={resetForm}
              style={btnGray}
            >
              Back
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div style={formGrid}>

              {/* COMPANY NAME */}
              <Field label="Company Name">

                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={input}
                />

              </Field>

              {/* MOBILE */}
              <Field label="Mobile">

                <input
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  style={input}
                />

              </Field>

              {/* OPENING BALANCE */}
              <Field label="Opening Balance">

                <input
                  type="number"
                  step="0.01"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleChange}
                  style={input}
                />

              </Field>

              {/* BALANCE TYPE */}
              <Field label="Balance Type">

                <select
                  name="opening_balance_type"
                  value={
                    formData.opening_balance_type
                  }
                  onChange={handleChange}
                  style={input}
                >
                  <option value="dr">
                    DR
                  </option>

                  <option value="cr">
                    CR
                  </option>

                </select>

              </Field>

              {/* ADDRESS */}
              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >

                <Field label="Address">

                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    style={{
                      ...input,
                      resize: "vertical",
                    }}
                  />

                </Field>

              </div>

            </div>

            <div style={actionRow}>

              <button
                type="submit"
                style={btnPrimary}
              >
                {editId
                  ? "Update"
                  : "Save"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={btnGray}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      ) : (

        <>

          <div style={topBar}>

            <h2 style={title}>
              Company Management
            </h2>

            <button
              onClick={() =>
                setShowForm(true)
              }
              style={btnPrimary}
            >
              Add Company
            </button>

          </div>

          <div style={tableCard}>

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >

              <thead>

                <tr style={thead}>

                  <th style={th}>
                    S.L No
                  </th>

                  <th style={th}>
                    Company Name
                  </th>

                  <th style={th}>
                    Address
                  </th>

                  <th style={th}>
                    Mobile
                  </th>

                  <th style={th}>
                    Opening Balance
                  </th>

                  <th style={th}>
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {companies.length > 0 ? (

                  companies.map(
                    (
                      comp,
                      index
                    ) => (

                      <tr
                        key={comp.id}
                        style={{
                          background:
                            index % 2 === 0
                              ? "#fff"
                              : "#f8fafc",
                        }}
                      >

                        {/* S.L NO */}
                        <td style={td}>
                          {index + 1}
                        </td>

                        {/* NAME */}
                        <td style={td}>
                          {comp.name || "-"}
                        </td>

                        {/* ADDRESS */}
                        <td style={td}>
                          {comp.address || "-"}
                        </td>

                        {/* MOBILE */}
                        <td style={td}>
                          {comp.mobile || "-"}
                        </td>

                        {/* OPENING BALANCE */}
                        <td style={td}>

                          ₹
                          {Number(
                            comp.opening_balance ?? 0
                          ).toFixed(2)}{" "}

                          {String(
                            comp.opening_balance_type ?? "dr"
                          ).toUpperCase()}

                        </td>

                        {/* ACTION */}
                        <td style={td}>

                          <button
                            onClick={() =>
                              handleEdit(comp)
                            }
                            style={editBtn}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                comp.id
                              )
                            }
                            style={deleteBtn}
                          >
                            Delete
                          </button>

                        </td>

                      </tr>
                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={6}
                      style={{
                        ...td,
                        textAlign:
                          "center",
                      }}
                    >
                      No companies found
                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </>
      )}

    </div>
  );
}

function Field({
  label,
  children,
}) {

  return (

    <div>

      <div style={labelStyle}>
        {label}
      </div>

      {children}

    </div>
  );
}

const pageStyle = {
  padding: 14,
  fontFamily:
    "Segoe UI, sans-serif",
};

const card = {
  background: "#fff",
  border:
    "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
};

const topBar = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const title = {
  margin: 0,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
};

const input = {
  width: "100%",
  padding: 10,
  border:
    "1px solid #cbd5e1",
  borderRadius: 8,
};

const labelStyle = {
  marginBottom: 6,
  fontWeight: 600,
};

const actionRow = {
  display: "flex",
  gap: 10,
  marginTop: 20,
};

const btnPrimary = {
  background: "#0f766e",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

const btnGray = {
  background: "#64748b",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

const tableCard = {
  overflowX: "auto",
  border:
    "1px solid #e2e8f0",
  borderRadius: 12,
};

const thead = {
  background: "#0f766e",
  color: "#fff",
};

const th = {
  padding: 12,
  textAlign: "left",
};

const td = {
  padding: 10,
  borderBottom:
    "1px solid #e2e8f0",
};

const editBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  marginRight: 6,
  cursor: "pointer",
};

const deleteBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
};
