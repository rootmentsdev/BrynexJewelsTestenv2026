// backend/model/Counter.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

/* one document per store (locCode) */
export default model(
  "Counter",
  new Schema({
    _id: { type: String, required: true }, // e.g. "144"
    seq: { type: Number, default: 0 }      // running integer
  })
);
