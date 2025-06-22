import React, { useState, useEffect } from "react";
import './App.css';

const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [recordData, setRecordData] = useState({});
  const [editIndex, setEditIndex] = useState(null);
  const [isEditingFields, setIsEditingFields] = useState(false);


  useEffect(() => {
    if (token) fetchTables();
  }, [token]);

  const toggleMode = () => setIsLogin(!isLogin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/login" : "/signup";
    const res = await fetch(`http://localhost:5000${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } else {
      alert("Authentication failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setTables([]);
    setSelectedTable(null);
  };

  const addField = () => {
    setFields([...fields, { name: "", type: "text", required: false }]);
  };

  const handleFieldChange = (i, key, value) => {
    const updated = [...fields];
    updated[i][key] = key === "required" ? value.target.checked : value;
    setFields(updated);
  };

  const createTable = async () => {
    if (!tableName.trim()) return alert("Table name is required");

    const trimmedNames = fields.map(f => f.name.trim());

    if (new Set(trimmedNames).size !== trimmedNames.length) {
      return alert("Field names must be unique");
    }

    for (const name of trimmedNames) {
      if (!name) return alert("All field names must be filled");
    }

    const res = await fetch("http://localhost:5000/table", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tableName, fields }),
    });
    const data = await res.json();
    if (data._id) {
      setTableName("");
      setFields([]);
      fetchTables();
    } else {
      alert("Failed to create table");
    }
  };

  const fetchTables = async () => {
    const res = await fetch("http://localhost:5000/tables", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTables(data);
  };

  const deleteTable = async (id) => {
    await fetch(`http://localhost:5000/table/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTables();
    setSelectedTable(null);
  };

  const fetchTableDetails = async (id) => {
    const res = await fetch(`http://localhost:5000/table/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSelectedTable(data);
  };

const validateRequiredFields = () => {
  for (const field of selectedTable.fields) {
    if (field.required && (recordData[field.name] === undefined || recordData[field.name] === "")) {
      alert(`Field "${field.name}" is required.`);
      return false;
    }
  }
  return true;
};

const updateTableFields = async () => {
  const res = await fetch(`http://localhost:5000/table/${selectedTable._id}/fields`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: selectedTable.fields }),
  });

  const data = await res.json();
  if (data.fields) {
    alert("Columns updated");
    fetchTableDetails(selectedTable._id);
    setIsEditingFields(false);
  } else {
    alert("Update failed");
  }
};



  const submitRecord = async () => {
    if (!validateRequiredFields()) return;
    const res = await fetch(`http://localhost:5000/table/${selectedTable._id}/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recordData),
    });
    const data = await res.json();
    if (data.message) {
      setRecordData({});
      fetchTableDetails(selectedTable._id);
    } else {
      alert("Failed to add record");
    }
  };

  const handleDeleteRecord = async (index) => {
    await fetch(`http://localhost:5000/table/${selectedTable._id}/record/${index}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTableDetails(selectedTable._id);
  };

  const handleEditRecord = (index) => {
    const row = selectedTable.rows[index];
    setRecordData(row);
    setEditIndex(index);
  };

  const updateRecord = async () => {
    if (!validateRequiredFields()) return;
    const res = await fetch(`http://localhost:5000/table/${selectedTable._id}/record/${editIndex}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recordData),
    });
    const data = await res.json();
    if (data.message) {
      setEditIndex(null);
      setRecordData({});
      fetchTableDetails(selectedTable._id);
    }
  };

  if (!token) {
    return (
      <div>
        <h2>{isLogin ? "Login" : "Signup"}</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit">{isLogin ? "Login" : "Signup"}</button>
        </form>
        <button onClick={toggleMode}>
          {isLogin ? "No account? Signup" : "Have account? Login"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome to Airtable Clone</h2>
      <button onClick={logout}>Logout</button>

      <h3>Create Table</h3>
      <input placeholder="Table Name" value={tableName} onChange={e => setTableName(e.target.value)} />
      {fields.map((f, i) => (
        <div key={i}>
          <input placeholder="Field Name" value={f.name} onChange={e => handleFieldChange(i, "name", e.target.value)} />
          <select value={f.type} onChange={e => handleFieldChange(i, "type", e.target.value)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <label>
            Required <input type="checkbox" checked={f.required} onChange={e => handleFieldChange(i, "required", e)} />
          </label>
        </div>
      ))}
      <button onClick={addField}>Add Field</button>
      <button onClick={createTable}>Create Table</button>

      <h3>Your Tables</h3>
      <ul>
        {tables.map(t => (
          <li key={t._id}>
            {t.tableName}
            <button onClick={() => fetchTableDetails(t._id)}>View</button>
          </li>
        ))}
      </ul>

      {selectedTable && (
        <div>
          <h4>
            📋 Table: {selectedTable.tableName}
            <button onClick={() => setIsEditingFields(!isEditingFields)}>
              {isEditingFields ? "Done" : "Edit Columns"}
            </button>
            <button onClick={() => deleteTable(selectedTable._id)}>Delete Table</button>
          </h4>
          {isEditingFields && (
            <div>
              <h5>Edit Columns</h5>
              {selectedTable.fields.map((field, i) => (
                <div key={i}>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => {
                      const updated = [...selectedTable.fields];
                      updated[i].name = e.target.value;
                      setSelectedTable({ ...selectedTable, fields: updated });
                    }}
                  />
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const updated = [...selectedTable.fields];
                      updated[i].type = e.target.value;
                      setSelectedTable({ ...selectedTable, fields: updated });
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                  <label>
                    Required
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const updated = [...selectedTable.fields];
                        updated[i].required = e.target.checked;
                        setSelectedTable({ ...selectedTable, fields: updated });
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm("Delete this column? This will remove its data from all records.");
                      if (confirmed) {
                        const updated = selectedTable.fields.filter((_, idx) => idx !== i);
                        setSelectedTable({ ...selectedTable, fields: updated });
                      }
                    }}
                  >
                    ❌
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const updated = [...selectedTable.fields, { name: "", type: "text", required: false }];
                  setSelectedTable({ ...selectedTable, fields: updated });
                }}
              >
                ➕ Add Column
              </button>
              <button onClick={updateTableFields}>💾 Save Changes</button>
            </div>
          )}
          
          <table border="1">
            <thead>
              <tr>
                {selectedTable.fields.map(f => <th key={f.name}>{f.name}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedTable.rows.map((row, i) => (
                <tr key={i}>
                  {selectedTable.fields.map(f => (
                    <td key={f.name}>{String(row[f.name] ?? "")}</td>
                  ))}
                  <td>
                    <button onClick={() => handleEditRecord(i)}>Edit</button>
                    <button onClick={() => handleDeleteRecord(i)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>{editIndex !== null ? "Edit Record" : "Add Record"}</h4>
          {selectedTable.fields.map((f, i) => (
            <div key={i}>
              <label>
                {f.name} {f.required && <span style={{ color: "red" }}>*</span>}
              </label>
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                value={recordData[f.name] ?? ""}
                onChange={e => setRecordData(prev => ({
                  ...prev,
                  [f.name]: f.type === "checkbox" ? e.target.checked : e.target.value,
                }))}
              />
            </div>
          ))}
          <button onClick={editIndex !== null ? updateRecord : submitRecord}>
            {editIndex !== null ? "Update Record" : "Add Record"}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;