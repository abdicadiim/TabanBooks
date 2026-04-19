/**
 * Express App Setup
 * Routes, middleware configuration
 * Updated at: ${new Date().toISOString()}
 */

import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { debugMiddleware } from "./utils/debug.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the active runtime directory first, then fall back
// to the parent folder so both `tsx server.ts` and `node dist/server.js` work.
const envCandidates = [
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

// Import routes
import authRoutes from "./routes/auth.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import purchasesRoutes from "./routes/purchases.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import bankingRoutes from "./routes/banking.routes.js";
import accountantRoutes from "./routes/accountant.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import usersRoutes from "./routes/users.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import contactsRoutes from "./routes/contacts.routes.js";
import recurringExpenseRoutes from "./routes/recurringExpense.routes.js";
import recurringBillRoutes from "./routes/recurringBill.routes.js";
import paymentTermsRoutes from "./routes/paymentTerms.routes.js";
import accountsReceivableRoutes from "./routes/accountsReceivable.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import websiteRoutes from "./routes/website.routes.js";
import organizationsRoutes from "./routes/organizations.routes.js";

const app: Express = express();

// Middleware
const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const defaultOrigins = [
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
];

const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;
const allowUnknownOrigins =
  configuredOrigins.length === 0 || (process.env.NODE_ENV || "development") !== "production";

const uploadsDirectoryCandidates = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "..", "uploads"),
];
const uploadsDirectory =
  uploadsDirectoryCandidates.find((candidate) => existsSync(candidate)) ??
  uploadsDirectoryCandidates[uploadsDirectoryCandidates.length - 1];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (allowUnknownOrigins) {
      callback(null, true); // Allow all origins in development
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware (only logs if DEBUG is enabled)
app.use(debugMiddleware);

// Serve uploads directory
app.use('/uploads', express.static(uploadsDirectory));

// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "Taban Books API",
    version: "1.0.0",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Taban Books API",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", organizationsRoutes);
app.use("/api", settingsRoutes);
app.use("/api", contactsRoutes);
app.use("/api", salesRoutes);
app.use("/api", purchasesRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", bankingRoutes);
app.use("/api", accountantRoutes);
app.use("/api", projectsRoutes);
app.use("/api", reportsRoutes);
app.use("/api", documentsRoutes);
app.use("/api", usersRoutes);
app.use("/api", rolesRoutes);
app.use("/api", recurringExpenseRoutes);
app.use("/api", recurringBillRoutes);
app.use("/api/payment-terms", paymentTermsRoutes);
app.use("/api/journal-entries", accountsReceivableRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/website", websiteRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;

