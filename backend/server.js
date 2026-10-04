// backend/server.js
import express        from "express";
import cookieParser   from "cookie-parser";
import cors           from "cors";
import dotenv         from "dotenv";
import fs             from "fs";

import connectMongoDB from "./db/database.js";
// PostgreSQL import will be lazy-loaded when needed
import UserRouter     from "./route/LoginRoute.js";
import TwsRoutes      from "./route/TwsRoutes.js";
import ShoeItemRoutes from "./route/ShoeItemRoutes.js";
import ItemGroupRoutes from "./route/ItemGroupRoutes.js";
import AddressRoutes  from "./route/AddressRoutes.js";
import VendorRoutes   from "./route/VendorRoutes.js";
import BillRoutes     from "./route/BillRoutes.js";
import VendorCreditRoutes from "./route/VendorCreditRoutes.js";
import PurchaseOrderRoutes from "./route/PurchaseOrderRoutes.js";
import PurchaseReceiveRoutes from "./route/PurchaseReceiveRoutes.js";
import InventoryAdjustmentRoutes from "./route/InventoryAdjustmentRoutes.js";
import TransferOrderRoutes from "./route/TransferOrderRoutes.js";
import StoreOrderRoutes from "./route/StoreOrderRoutes.js";
import StoreRoutes from "./route/StoreRoutes.js";
import SalesPersonRoutes from "./route/SalesPersonRoutes.js";
import SalesInvoiceRoutes from "./route/SalesInvoiceRoutes.js";
import DayBookRoutes from "./route/DayBookRoutes.js";
import SalesReportRoutes from "./route/SalesReportRoutes.js";
import InventoryReportRoutes from "./route/InventoryReportRoutes.js";
import ReorderAlertRoutes from "./route/ReorderAlertRoutes.js";
import ManufacturerRoutes from "./route/ManufacturerRoutes.js";
import BrandRoutes from "./route/BrandRoutes.js";
import setupSwagger   from "./swagger.js";

const env     = process.env.NODE_ENV || "development";
const envFile = `.env.${env}`;
fs.existsSync(envFile) ? dotenv.config({ path: envFile }) : dotenv.config();

const app  = express();
const PORT = process.env.PORT || 7000;

setupSwagger(app);

// ── middleware ──────────────────────────────────────────────
// 🛠️ Increase body size limit for large base64 attachments
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://rootfin.vercel.app",
  "https://rootfin.rootments.live",
  "https://rootfin-testenv-clab.vercel.app",
  "https://rootfin-testenv-3.onrender.com",
  "https://rootfin-testenv-ebb5.onrender.com",
  "https://api.rootments.live",
  "https://rootfin-production.vercel.app",
  "https://rootfinjewels.brynex.com",
  "https://rootfin-brynex-testenv.vercel.app",
  "https://brynex-jewels-bnwf.vercel.app"
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin) ||
      /\.rootments\.live$/.test(origin) ||
      /\.brynex\.com$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-user-id", "x-user-name", "user"],
};

// Enable Chrome Private Network Access for Local Print Spooler from Cloud HTTPS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// ── routes ──────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("App is running on AWS"));

app.use("/user",    UserRouter);
app.use("/api/tws", TwsRoutes);
app.use("/api",     ShoeItemRoutes);
app.use("/api",     ItemGroupRoutes);
app.use("/api",     AddressRoutes);
app.use("/api",     VendorRoutes);
app.use("/api",     BillRoutes);
app.use("/api",     VendorCreditRoutes);
app.use("/api",     PurchaseOrderRoutes);
app.use("/api",     PurchaseReceiveRoutes);
app.use("/api",     InventoryAdjustmentRoutes);
app.use("/api",     TransferOrderRoutes);
app.use("/api",     StoreOrderRoutes);
app.use("/api",     StoreRoutes);
app.use("/api",     SalesPersonRoutes);
app.use("/api",     SalesInvoiceRoutes);
app.use("/api",     DayBookRoutes);
app.use("/api/reports/sales", SalesReportRoutes);
app.use("/api/reports/inventory", InventoryReportRoutes);
app.use("/api",     ReorderAlertRoutes);
app.use("/api",     ManufacturerRoutes);
app.use("/api",     BrandRoutes);

// Test route to verify server is running
app.get("/api/test", (_req, res) => {
  res.json({ message: "API is working", routes: ["/api/purchase/vendors", "/api/purchase/bills", "/api/purchase/orders", "/api/purchase/receives"] });
});

// Database status endpoint
app.get("/api/db-status", async (_req, res) => {
  try {
    const status = {
      environment: process.env.NODE_ENV || 'development',
      dbType: process.env.DB_TYPE || 'mongodb',
      databases: {}
    };

    // Check PostgreSQL
    if (process.env.DB_TYPE === 'postgresql' || process.env.DB_TYPE === 'both') {
      try {
        const { getSequelize } = await import('./db/postgresql.js');
        const sequelize = getSequelize();
        await sequelize.authenticate();
        status.databases.postgresql = {
          connected: true,
          database: sequelize.getDatabaseName(),
          host: sequelize.config.host || 'connection string'
        };
      } catch (error) {
        status.databases.postgresql = {
          connected: false,
          error: error.message
        };
      }
    }

    // Check MongoDB
    if (process.env.DB_TYPE === 'mongodb' || process.env.DB_TYPE === 'both') {
      const mongoose = await import('mongoose');
      status.databases.mongodb = {
        connected: mongoose.default.connection.readyState === 1,
        state: mongoose.default.connection.readyState
      };
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── start server ────────────────────────────────────────────
// Database configuration: can use 'mongodb', 'postgresql', or 'both'
const DB_TYPE = process.env.DB_TYPE || 'mongodb'; // 'mongodb', 'postgresql', or 'both'

app.listen(PORT, async () => {
  try {
    const connectedDbs = [];
    
    // Connect to MongoDB
    if (DB_TYPE === 'mongodb' || DB_TYPE === 'both') {
      console.log('📊 Connecting to MongoDB database...');
      await connectMongoDB();
      connectedDbs.push('MongoDB');
    }
    
    // Connect to PostgreSQL
    if (DB_TYPE === 'postgresql' || DB_TYPE === 'both') {
      console.log('📊 Connecting to PostgreSQL database...');
      try {
        const { connectPostgreSQL } = await import('./db/postgresql.js');
        await connectPostgreSQL();
        connectedDbs.push('PostgreSQL');
      } catch (pgError) {
        console.error('⚠️ PostgreSQL unavailable, continuing with MongoDB only:', pgError.message);
      }
    }
    
    console.log(`🚀  Server listening on :${PORT}`);
    console.log(`💾 Connected databases: ${connectedDbs.join(' + ')}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});

console.log("Auto-deploy test at " + new Date());


// backend/server.js
// import express        from "express";
// import cookieParser   from "cookie-parser";
// import cors           from "cors";
// import dotenv         from "dotenv";
// import fs             from "fs";
// import morgan         from "morgan";

// import connectMongoDB from "./db/database.js";
// import UserRouter     from "./route/LoginRoute.js";
// import TwsRoutes      from "./route/TwsRoutes.js";
// import MergRoutes     from "./route/MergRoutes.js";  // <- ensure this exists/exports router
// import setupSwagger   from "./swagger.js";

// const env     = process.env.NODE_ENV || "development";
// const envFile = `.env.${env}`;
// fs.existsSync(envFile) ? dotenv.config({ path: envFile }) : dotenv.config();

// const app  = express();
// const PORT = process.env.PORT || 7000;

// setupSwagger(app);

// // ========= DEBUG LOGGING (see if requests arrive) =========
// app.use(morgan(':date[iso] :method :url :status :res[content-length] - :response-time ms'));
// app.use((req, _res, next) => {
//   console.log("[INCOMING]", {
//     method: req.method,
//     url: req.url,
//     origin: req.headers.origin,
//     'content-type': req.headers['content-type'],
//   });
//   next();
// });

// // ========= BODY LIMITS (base64 JSON) =========
// app.use(express.json({ limit: "25mb" }));
// app.use(express.urlencoded({ extended: true, limit: "25mb" }));
// app.use(cookieParser());

// // ========= TEMP: OPEN CORS FULLY TO TEST =========
// // (Once working, replace with your strict list.)
// // If you use credentials on the frontend, *do not* use "*".
// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
//   allowedHeaders: ["Content-Type","Authorization","X-Requested-With"],
// }));
// app.options("*", cors());

// // ========= HEALTH + CORS PROBE =========
// app.get("/api/health", (req, res) => {
//   res.set("Cache-Control", "no-store");
//   res.json({ ok: true, now: new Date().toISOString() });
// });
// app.options("/api/health", (req, res) => {
//   res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
//   res.set("Access-Control-Allow-Credentials", "true");
//   res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
//   res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
//   res.status(204).end();
// });

// // ========= YOUR ROUTES =========
// app.get("/", (_req, res) => res.send("App is running on AWS"));

// app.use("/user",    UserRouter);
// app.use("/api/tws", TwsRoutes);
// app.use("/api",     MergRoutes);   // <-- this must expose /createPayment, /Getpayment

// // 404 helper (only for API prefixes)
// app.use((req, res, next) => {
//   if (req.path.startsWith("/api") || req.path.startsWith("/user")) {
//     return res.status(404).json({ message: "Route not found", path: req.path });
//   }
//   next();
// });

// // Global error handler so you get JSON instead of empty 500
// app.use((err, req, res, _next) => {
//   console.error("Unhandled error:", err);
//   if (res.headersSent) return;
//   res.status(500).json({ message: "Server error", error: err.message });
// });

// // ========= START =========
// connectMongoDB(env);
// app.listen(PORT, () => {
//   console.log(`🚀  Server listening on :${PORT}`);
// });
