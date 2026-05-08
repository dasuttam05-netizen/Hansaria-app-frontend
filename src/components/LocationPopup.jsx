import React, { useEffect, useState } from "react";
import axios from "axios";

export default function LocationPopup({ onClose }) {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ name: "", address: "", hsn_code: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await axios.get("/api/locations");
    setLocations(res.data);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.address) {
      alert("Name & Address required");
      return;
    }

    if (editingId) {
      await axios.put(`/api/locations/${editingId}`, form);
    } else {
      await axios.post("/api/locations", form);
    }

    setForm({ name: "", address: "", hsn_code: "" });
    setEditingId(null);
    fetchLocations();
  };

  const handleEdit = (loc) => {
    setForm({ name: loc.name, address: loc.address, hsn_code: loc.hsn_code });
    setEditingId(loc.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this location?")) {
      await axios.delete(`/api/locations/${id}`);
      fetchLocations();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white w-3/4 p-6 rounded-xl shadow-lg relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
          onClick={onClose}
        >
          ❌
        </button>

        <h2 className="text-xl font-bold mb-4">📍 Location Management</h2>

        {/* Form */}
        <div className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Location Name"
            className="border p-2 w-full rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Address"
            className="border p-2 w-full rounded"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            type="text"
            placeholder="HSN Code"
            className="border p-2 w-full rounded"
            value={form.hsn_code}
            onChange={(e) => setForm({ ...form, hsn_code: e.target.value })}
          />

          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setForm({ name: "", address: "", hsn_code: "" });
                setEditingId(null);
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">HSN Code</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td className="border p-2">{loc.id}</td>
                <td className="border p-2">{loc.name}</td>
                <td className="border p-2">{loc.address}</td>
                <td className="border p-2">{loc.hsn_code || "-"}</td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
