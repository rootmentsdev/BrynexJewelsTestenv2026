import mongoose from "mongoose";

const CloseSchema = new mongoose.Schema(
    {

        cash: {
            type: Number,
            required: true,
        },
        Closecash: {
            type: Number,
            required: true,
        },
        bank: {
            type: Number,
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },
        locCode: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

// Indexes for frequent queries by locCode + date
CloseSchema.index({ locCode: 1, date: -1 });
CloseSchema.index({ date: -1 });

const CloseTransaction = mongoose.model("Close", CloseSchema);
export default CloseTransaction;
