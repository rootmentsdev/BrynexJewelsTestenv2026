import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || "mongodb+srv://rootmentssanu_db_user:kHv8JD0hIsP8OzRM@cluster0.ebsj7rs.mongodb.net/jewels?appName=Cluster0";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  locCode: { type: String, required: false, default: "858" },
  power: { type: String, enum: ["admin", "normal"], required: true, default: "admin" },
  password: { type: String, required: true },
  address: { type: String, default: "" },
  phone: { type: String, default: "" },
  gst: { type: String, default: "" },
  role: { type: String, default: "admin" },
  storeName: { type: String, default: "Warehouse" },
  storeId: { type: String, default: null },
  allowedLocCodes: { type: [String], default: ["858", "103", "718"] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function createOrUpdateAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully.");

    const email = "brynex@gmail.com";
    const plainPassword = "brynex1234";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      console.log(`User ${email} already exists. Updating credentials and admin power...`);
      existingUser.username = "Brynex Admin";
      existingUser.password = hashedPassword;
      existingUser.power = "admin";
      existingUser.role = "admin";
      existingUser.locCode = "858";
      existingUser.storeName = "Warehouse";
      existingUser.allowedLocCodes = ["858", "103", "718"];
      existingUser.updatedAt = new Date();
      await existingUser.save();
      console.log(`✅ Admin user ${email} updated successfully!`);
    } else {
      console.log(`Creating new admin user: ${email}...`);
      const newUser = new User({
        username: "Brynex Admin",
        email: email.toLowerCase(),
        password: hashedPassword,
        power: "admin",
        role: "admin",
        locCode: "858",
        storeName: "Warehouse",
        allowedLocCodes: ["858", "103", "718"],
      });
      await newUser.save();
      console.log(`✅ Admin user ${email} created successfully!`);
    }

    // Verify password check
    const verifyUser = await User.findOne({ email: email.toLowerCase() });
    const isMatch = await bcrypt.compare(plainPassword, verifyUser.password);
    console.log(`Password verification test: ${isMatch ? "SUCCESS (password matches)" : "FAILED"}`);

    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin user:", err);
    process.exit(1);
  }
}

createOrUpdateAdmin();
