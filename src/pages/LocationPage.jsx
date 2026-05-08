import React, { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";

export default function LocationPage() {
  const [locations, setLocations] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", address: "" });

  useEffect(() => {
    fetch(getApiUrl("/api/locations"))
      .then((res) => res.json())
      .then(setLocations);
  }, []);

  const handleDelete = async (id) => {
    await fetch(getApiUrl(`/api/locations/${id}`), { method: "DELETE" });
    setLocations(locations.filter((l) => l.id !== id));
  };

  const handleEdit = (loc) => {
    setEditing(loc.id);
    setForm({ name: loc.name, address: loc.address });
  };

  const handleUpdate = async (id) => {
    await fetch(getApiUrl(`/api/locations/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLocations(locations.map((l) => (l.id === id ? { ...l, ...form } : l)));
    setEditing(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Locations</h2>
      <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Location Name</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.id}>
              <td>{loc.id}</td>
              <td>
                {editing === loc.id ? (
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                ) : (
                  loc.name
                )}
              </td>
              <td>
                {editing === loc.id ? (
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                ) : (
                  loc.address
                )}
              </td>
              <td>
                {editing === loc.id ? (
                  <button onClick={() => handleUpdate(loc.id)}>Save</button>
                ) : (
                  <>
                    <button onClick={() => handleEdit(loc)}>Edit</button>
                    <button onClick={() => handleDelete(loc.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
