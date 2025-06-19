import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["text", "number", "date", "checkbox"], required: true },
  required: { type: Boolean, default: false },
});

const dynamicTableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tableName: { type: String, required: true },
  fields: { type: [fieldSchema], required: true },
  rows: { type: [mongoose.Schema.Types.Mixed], default: [] }, // flexible JSON per row
});

export const DynamicTable = mongoose.model("DynamicTable", dynamicTableSchema);
