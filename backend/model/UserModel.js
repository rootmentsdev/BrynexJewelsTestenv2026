import mongoose from 'mongoose';



const userSchema = new mongoose.Schema({
    username: { type: String, required: true, },
    email: { type: String, required: true, unique: true },
    locCode: { type: String, required: false, default: '' },
    power: { type: String, enum: ["admin", "normal"], required: true, default: 'normal' },
    password: { type: String, required: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    gst: { type: String, default: '' },
    // Store-level access control fields (new, non-breaking)
    role: { type: String, enum: ["admin", "superadmin", "store_manager", "store_user", "cluster_manager"], default: null },
    storeName: { type: String, default: null },
    storeId: { type: String, default: null },
    allowedLocCodes: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);
export default User;


// //user designation
