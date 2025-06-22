import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { DynamicTable } from "./models/DynamicTable.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Mongo error:", err));

// User schema and model
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Auth routes
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  const isValid = await bcrypt.compare(password, user?.password || "");
  if (isValid) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Create a new table
app.post("/table", authenticate, async (req, res) => {
  const { tableName, fields } = req.body;

  if (!tableName || !fields.every(f => f.name)) {
    return res.status(400).json({ error: "Table name and all field names are required" });
  }

  const fieldNames = fields.map(f => f.name.trim());
  const uniqueNames = new Set(fieldNames);

  if (fieldNames.length !== uniqueNames.size) {
    return res.status(400).json({ error: "Field names must be unique" });
  }

  const table = await DynamicTable.create({
    userId: req.userId,
    tableName,
    fields,
    rows: [],
  });

  res.json(table);
});

// Get all tables for user
app.get("/tables", authenticate, async (req, res) => {
  const tables = await DynamicTable.find({ userId: req.userId }).select("tableName");
  res.json(tables);
});

// Get specific table with rows
app.get("/table/:id", authenticate, async (req, res) => {
  const table = await DynamicTable.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!table) return res.status(404).json({ error: "Table not found" });
  res.json(table);
});

// Delete entire table
app.delete("/table/:id", authenticate, async (req, res) => {
  await DynamicTable.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ message: "Table deleted" });
});

// Update table fields (columns)
app.put("/table/:id/fields", authenticate, async (req, res) => {
  const { fields } = req.body;
  if (!fields || !Array.isArray(fields) || fields.some(f => !f.name)) {
    return res.status(400).json({ error: "All fields must have a name." });
  }

  const table = await DynamicTable.findOne({ _id: req.params.id, userId: req.userId });
  if (!table) return res.status(404).json({ error: "Table not found" });

  // Confirm which fields are being removed
  const oldFieldNames = table.fields.map(f => f.name);
  const newFieldNames = fields.map(f => f.name);

  const removedFields = oldFieldNames.filter(name => !newFieldNames.includes(name));
  if (removedFields.length > 0) {
    // Remove data for deleted columns from all rows
    table.rows = table.rows.map(row => {
      removedFields.forEach(field => delete row[field]);
      return row;
    });
  }

  table.fields = fields;
  await table.save();
  res.json({ message: "Fields updated successfully", fields: table.fields });
});


// Add record to table
app.post("/table/:id/record", authenticate, async (req, res) => {
  const table = await DynamicTable.findOne({ _id: req.params.id, userId: req.userId });
  if (!table) return res.status(404).json({ error: "Table not found" });
  for (const field of table.fields) {
    if (field.required && (req.body[field.name] === undefined || req.body[field.name] === "")) {
      return res.status(400).json({ error: `Field "${field.name}" is required` });
    }
  }
  table.rows.push(req.body);
  await table.save();
  res.json({ message: "Record added" });
});

// Delete record
app.delete("/table/:id/record/:index", authenticate, async (req, res) => {
  const table = await DynamicTable.findOne({ _id: req.params.id, userId: req.userId });
  if (!table) return res.status(404).json({ error: "Table not found" });
  table.rows.splice(req.params.index, 1);
  await table.save();
  res.json({ message: "Record deleted" });
});

// Update a record
app.put("/table/:id/record/:index", authenticate, async (req, res) => {
  const table = await DynamicTable.findOne({ _id: req.params.id, userId: req.userId });
  if (!table) return res.status(404).json({ error: "Table not found" });

  for (const field of table.fields) {
    if (field.required && (req.body[field.name] === undefined || req.body[field.name] === "")) {
      return res.status(400).json({ error: `Field "${field.name}" is required` });
    }
  }
  table.rows[req.params.index] = req.body;

  await table.save();
  res.json({ message: "Record updated" });
});

// Start server
app.listen(5000, () => console.log("Server listening on http://localhost:5000"));
