import mongoose from "mongoose";

const ManufacturerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
ManufacturerSchema.index({ isActive: 1 });

const Manufacturer = mongoose.model("Manufacturer", ManufacturerSchema);
export default Manufacturer;

