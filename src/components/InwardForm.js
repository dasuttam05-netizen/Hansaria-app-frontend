// src/components/InwardForm.js
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function InwardForm() {
  const [form, setForm] = useState({
    date: "",
    location_id: "",
    employee_id: "",
    lorry_no: "",
    product_id: "",
    warehouse_id: "",
    company_id: "",
    company_account_id: "",
    weight: "",
    shortage: "",
    rent: "",
    labour_charges: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/inward", form);
      alert("Inward entry saved with ID: " + res.data.id);
      setForm({
        date: "",
        location_id: "",
        employee_id: "",
        lorry_no: "",
        product_id: "",
        warehouse_id: "",
        company_id: "",
        company_account_id: "",
        weight: "",
        shortage: "",
        rent: "",
        labour_charges: ""
      });
    } catch (err) {
      console.error(err);
      alert("Error saving inward entry");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>New Inward Entry</h2>
      <form onSubmit={handleSubmit}>
        <input type="date" name="date" value={form.date} onChange={handleChange} required />
        <input type="text" name="lorry_no" placeholder="Lorry No" value={form.lorry_no} onChange={handleChange} />
        <input type="number" name="weight" placeholder="Weight" value={form.weight} onChange={handleChange} />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
