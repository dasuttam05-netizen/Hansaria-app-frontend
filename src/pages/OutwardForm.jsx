import React, { useState, useEffect } from "react";
import axios from "axios";

export default function OutwardForm({ onSaved, onCancel, editData }) {

  const API = "/api";

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
    labour_charges: ""
  });

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);

  useEffect(() => {

    axios.get(`${API}/employees`).then(res => setEmployees(res.data));
    axios.get(`${API}/locations`).then(res => setLocations(res.data));
    axios.get(`${API}/warehouses`).then(res => setWarehouses(res.data));
    axios.get(`${API}/products`).then(res => setProducts(res.data));
    axios.get(`${API}/companies`).then(res => setCompanies(res.data));
    axios.get(`${API}/company_accounts`).then(res => setCompanyAccounts(res.data));

    if (editData) {
      setFormData({
        date: editData.date || "",
        employee_id: editData.employee_id || "",
        location_id: editData.location_id || "",
        warehouse_id: editData.warehouse_id || "",
        product_id: editData.product_id || "",
        company_id: editData.company_id || "",
        company_account_id: editData.company_account_id || "",
        lorry_no: editData.lorry_no || "",
        weight: editData.weight || "",
        labour_charges: editData.labour_charges || ""
      });
    }

  }, [editData]);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    const payload = {
      ...formData,
      employee_id: formData.employee_id ? Number(formData.employee_id) : null,
      location_id: formData.location_id ? Number(formData.location_id) : null,
      warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
      product_id: formData.product_id ? Number(formData.product_id) : null,
      company_id: formData.company_id ? Number(formData.company_id) : null,
      company_account_id: formData.company_account_id ? Number(formData.company_account_id) : null,
      weight: Number(formData.weight) || 0,
      labour_charges: Number(formData.labour_charges) || 0
    };

    try {

      if (editData) {

        const res = await axios.put(`${API}/outward/${editData.id}`, payload);
        if (onSaved) onSaved(res.data);

      } else {

        const res = await axios.post(`${API}/outward`, payload);
        if (onSaved) onSaved(res.data);

      }

    } catch (err) {

      console.error(err);
      alert(err.response?.data?.error || err.message);

    }

  };

  return (

    <form onSubmit={handleSubmit}>

      <input type="date" name="date" value={formData.date} onChange={handleChange} required />

      <select name="employee_id" value={formData.employee_id} onChange={handleChange}>
        <option value="">Employee</option>
        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      <select name="location_id" value={formData.location_id} onChange={handleChange}>
        <option value="">Location</option>
        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange}>
        <option value="">Warehouse</option>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>

      <select name="product_id" value={formData.product_id} onChange={handleChange}>
        <option value="">Product</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <select name="company_id" value={formData.company_id} onChange={handleChange}>
        <option value="">Company</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select name="company_account_id" value={formData.company_account_id} onChange={handleChange}>
        <option value="">Account</option>
        {companyAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
      </select>

      <input type="text" name="lorry_no" placeholder="Lorry No" value={formData.lorry_no} onChange={handleChange} />

      <input type="number" step="0.01" name="weight" placeholder="Weight" value={formData.weight} onChange={handleChange} />

      <input type="number" step="0.01" name="labour_charges" placeholder="Labour Charges" value={formData.labour_charges} onChange={handleChange} />

      <button type="submit">
        {editData ? "Update" : "Save"}
      </button>

      <button type="button" onClick={onCancel}>Cancel</button>

    </form>

  );
}