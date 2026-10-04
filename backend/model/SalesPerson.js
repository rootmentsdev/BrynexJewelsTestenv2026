import mongoose from "mongoose";

const SalesPersonSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      default: "-",
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "0000000000",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    locCode: {
      type: String,
      trim: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    position: {
      type: String,
      trim: true,
      default: "Sales Person",
    },
    hireDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SalesPerson = mongoose.model("SalesPerson", SalesPersonSchema);

export default SalesPerson;