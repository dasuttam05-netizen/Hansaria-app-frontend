import React, { useState, useEffect } from "react";
import axios from "axios";

export default function InwardForm({ onSaved, onCancel, editData }) {
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
    // Fetch all dropdown data
    axios.get(`${API}/employees`).then(res => setEmployees(res.data));
    axios.get(`${API}/locations`).then(res => setLocations(res.data));
    axios.get(`${API}/warehouses`).then(res => setWarehouses(res.data));
    axios.get(`${API}/products`).then(res => setProducts(res.data));
    axios.get(`${API}/companies`).then(res => setCompanies(res.data));
    axios.get(`${API}/company_accounts`).then(res => setCompanyAccounts(res.data));

    // If editData present, prefill form
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

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.date) {
      alert("Date is required");
      return;
    }

    if (editData) {
      // Update
      axios
        .put(`${API}/inward/${editData.id}`, formData)
        .then(res => onSaved && onSaved(res.data))
        .catch(err => alert(err.response?.data?.error || err.message));
    } else {
      // Create
      axios
        .post(`${API}/inward`, formData)
        .then(res => onSaved && onSaved(res.data))
        .catch(err => alert(err.response?.data?.error || err.message));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-white rounded shadow">
      <div>
        <label>Date:</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="border p-1 rounded w-full"
        />
      </div>

      <div>
        <label>Employee:</label>
        <select name="employee_id" value={formData.employee_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Location:</label>
        <select name="location_id" value={formData.location_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Location</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Warehouse:</label>
        <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Warehouse</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Product:</label>
        <select name="product_id" value={formData.product_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Company:</label>
        <select name="company_id" value={formData.company_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Company</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Company Account:</label>
        <select name="company_account_id" value={formData.company_account_id} onChange={handleChange} className="border p-1 rounded w-full">
          <option value="">Select Account</option>
          {companyAccounts.map(ca => (
            <option key={ca.id} value={ca.id}>{ca.account_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Lorry No:</label>
        <input type="text" name="lorry_no" value={formData.lorry_no} onChange={handleChange} className="border p-1 rounded w-full" />
      </div>

      <div>
        <label>Weight (MT):</label>
        <input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} className="border p-1 rounded w-full" />
      </div>

      <div>
        <label>Labour Charges:</label>
        <input type="number" step="0.01" name="labour_charges" value={formData.labour_charges} onChange={handleChange} className="border p-1 rounded w-full" />
      </div>

      <div className="flex space-x-2 mt-2">
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">{editData ? "Update" : "Save"}</button>
        <button type="button" onClick={onCancel} className="bg-gray-400 text-white px-4 py-1 rounded">Cancel</button>
      </div>
    </form>
  );
}
