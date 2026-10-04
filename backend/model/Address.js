import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    attention: {
      type: String,
      default: "",
    },
    street1: {
      type: String,
      default: "",
    },
    street2: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      default: "",
    },
    zip: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      required: true,
      // Can be ObjectId, email, or locCode
    },
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;

