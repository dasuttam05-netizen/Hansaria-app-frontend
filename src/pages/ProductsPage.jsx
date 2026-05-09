import React, { useEffect, useState } from "react";
import axios from "axios";

const emptyForm = () => ({
  name: "",
  hsn_code: "",
});

export default function ProductsManagementPage() {

  const [products, setProducts] =
    useState([]);

  const [showForm, setShowForm] =
    useState(false);

  const [formData, setFormData] =
    useState(emptyForm);

  const [editId, setEditId] =
    useState(null);

  const API_URL =
    "/api/products";

  const fetchProducts =
    async () => {

      try {

        const res =
          await axios.get(
            API_URL
          );

        setProducts(
          Array.isArray(
            res.data
          )
            ? res.data
            : []
        );

      } catch (err) {

        console.error(err);

        alert(
          "Failed to fetch products"
        );

      }

    };

  useEffect(() => {

    fetchProducts();

  }, []);

  const handleChange = (e) => {

    setFormData(
      (prev) => ({
        ...prev,
        [e.target.name]:
          e.target.value,
      })
    );

  };

  const resetForm = () => {

    setShowForm(false);

    setEditId(null);

    setFormData(
      emptyForm()
    );

  };

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (
        !formData.name ||
        !formData.hsn_code
      ) {

        alert(
          "Name and HSN Code are required"
        );

        return;

      }

      try {

        if (editId) {

          await axios.put(
            `${API_URL}/${editId}`,
            formData
          );

          alert(
            "Product updated successfully"
          );

        } else {

          await axios.post(
            API_URL,
            formData
          );

          alert(
            "Product added successfully"
          );

        }

        resetForm();

        fetchProducts();

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.error ||
            "Error saving product"
        );

      }

    };

  const handleEdit = (p) => {

    setFormData({
      name:
        p.name || "",

      hsn_code:
        p.hsn_code ||
        p.hsn ||
        "",
    });

    setEditId(
      p._id || p.id
    );

    setShowForm(true);

  };

  const handleDelete =
    async (id) => {

      if (
        !window.confirm(
          "Are you sure you want to delete this product?"
        )
      ) {
        return;
      }

      try {

        await axios.delete(
          `${API_URL}/${id}`
        );

        fetchProducts();

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.error ||
            "Error deleting product"
        );

      }

    };

  return (
    <div
      style={{
        fontFamily:
          "Segoe UI, Arial, sans-serif",
        padding: "8px",
      }}
    >

      {showForm ? (

        <div style={card}>

          <div style={headerRow}>

            <h2 style={titleStyle}>

              {editId
                ? "Edit Product"
                : "Add Product"}

            </h2>

            <button
              type="button"
              onClick={resetForm}
              style={btnPrimary}
            >
              Back To Product List
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
          >

            <div style={formGrid}>

              <Field
                label="Product Name"
              >

                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Product Name *"
                  style={inp}
                />

              </Field>

              <Field
                label="HSN Code"
              >

                <input
                  name="hsn_code"
                  value={formData.hsn_code}
                  onChange={handleChange}
                  placeholder="HSN Code *"
                  style={inp}
                />

              </Field>

            </div>

            <div style={actionRow}>

              <button
                type="submit"
                style={btnPrimary}
              >
                Save
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={btnPrimary}
              >
                Back To Product List
              </button>

            </div>

          </form>

        </div>

      ) : (

        <>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "14px",
              gap: 10,
              flexWrap: "wrap",
            }}
          >

            <h2 style={titleStyle}>
              Products Management
            </h2>

            <button
              type="button"
              onClick={() =>
                setShowForm(true)
              }
              style={{
                ...btnPrimary,
                background:
                  "#0f766e",
              }}
            >
              Add Product
            </button>

          </div>

          <div style={tableCard}>

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                fontSize: "13px",
              }}
            >

              <thead>

                <tr
                  style={{
                    background:
                      "#0f766e",
                    color: "#fff",
                  }}
                >

                  <th style={th}>
                    ID
                  </th>

                  <th style={th}>
                    Name
                  </th>

                  <th style={th}>
                    HSN Code
                  </th>

                  <th style={th}>
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {products.map(
                  (p, i) => (

                    <tr
                      key={
                        p._id ||
                        p.id
                      }
                      style={{
                        background:
                          i % 2
                            ? "#f8fafc"
                            : "#fff",
                      }}
                    >

                      <td style={td}>

                        {p._id ||
                          p.id}

                      </td>

                      <td style={td}>

                        {p.name ||
                          "-"}

                      </td>

                      <td style={td}>

                        {p.hsn_code ||
                          p.hsn ||
                          "-"}

                      </td>

                      <td style={td}>

                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              p
                            )
                          }
                          style={{
                            ...mini,
                            background:
                              "#2563eb",
                          }}
                        >
                          Edit
                        </button>{" "}

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              p._id ||
                                p.id
                            )
                          }
                          style={{
                            ...mini,
                            background:
                              "#dc2626",
                          }}
                        >
                          Delete
                        </button>

                      </td>

                    </tr>

                  )
                )}

                {products.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={4}
                      style={{
                        ...td,
                        textAlign:
                          "center",
                        padding:
                          "20px",
                      }}
                    >
                      No products found.
                    </td>

                  </tr>

                ) : null}

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

      <label style={lbl}>
        {label}
      </label>

      {children}

    </div>
  );

}

const titleStyle = {
  margin: 0,
  fontSize: "18px",
  color: "#0f172a",
};

const card = {
  background: "#fff",
  border:
    "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  maxWidth: "900px",
  margin: "0 auto",
  boxShadow:
    "0 4px 14px rgba(15,23,42,0.06)",
};

const tableCard = {
  overflowX: "auto",
  border:
    "1px solid #e2e8f0",
  borderRadius: "10px",
  background: "#fff",
};

const headerRow = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
  justifyContent:
    "space-between",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  alignItems: "start",
};

const actionRow = {
  display: "flex",
  gap: "12px",
  marginTop: "22px",
  flexWrap: "wrap",
};

const inp = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border:
    "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing:
    "border-box",
};

const lbl = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "13px",
  color: "#334155",
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

const th = {
  padding: "10px 8px",
  textAlign: "left",
  borderBottom:
    "1px solid #0d5c56",
};

const td = {
  padding: "8px",
  borderBottom:
    "1px solid #e2e8f0",
};

const mini = {
  border: "none",
  color: "#fff",
  padding: "5px 10px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};
