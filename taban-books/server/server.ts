/**
 * Application Entry Point
 * Starts the Express server
 * Restarted to apply changes: ${new Date().toISOString()}
 */

import app from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import { enableDebug, disableDebug, isDebugEnabled } from "./utils/debug.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fixJournalEntryIndex } from "./utils/fixJournalIndex.js";
import { fixCreditNoteIndex } from "./utils/fixCreditNoteIndex.js";
import { ensurePerformanceIndexes } from "./utils/ensurePerformanceIndexes.js";
import { sendReminders } from "./jobs/reminders.job.js";
import { processRecurringInvoices } from "./jobs/recurringInvoices.job.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envCandidates = [
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
];
for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

const PORT: number = parseInt(process.env.PORT || "5000", 10) || 5000;

const truthy = (value: string | undefined): boolean => {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const scheduleRemindersJob = () => {
  const jobsEnabledDefault = (process.env.NODE_ENV || "development") === "production";
  const jobsEnabled = truthy(process.env.ENABLE_BACKGROUND_JOBS) || jobsEnabledDefault;
  const remindersEnabled = jobsEnabled && (process.env.ENABLE_REMINDERS_JOB ? truthy(process.env.ENABLE_REMINDERS_JOB) : true);

  if (!remindersEnabled) {
    console.log("[JOBS] Reminders job is disabled. Set ENABLE_BACKGROUND_JOBS=true to enable.");
    return;
  }

  const intervalMinutesRaw = process.env.REMINDERS_JOB_INTERVAL_MINUTES || "60";
  const intervalMinutes = Math.max(5, Number(intervalMinutesRaw) || 60);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[JOBS] Reminders job enabled (every ${intervalMinutes} minutes).`);

  const run = async () => {
    try {
      await sendReminders();
    } catch (error: any) {
      console.error("[JOBS] Reminders job failed:", error?.message || error);
    }
  };

  // Run once at startup, then on interval.
  run();
  const timer = setInterval(run, intervalMs);
  (timer as any).unref?.();
};

const scheduleRecurringInvoicesJob = () => {
  const jobsEnabledDefault = (process.env.NODE_ENV || "development") === "production";
  const jobsEnabled = truthy(process.env.ENABLE_BACKGROUND_JOBS) || jobsEnabledDefault;
  const recurringEnabled =
    jobsEnabled &&
    (process.env.ENABLE_RECURRING_INVOICES_JOB ? truthy(process.env.ENABLE_RECURRING_INVOICES_JOB) : true);

  if (!recurringEnabled) {
    console.log("[JOBS] Recurring invoices job is disabled. Set ENABLE_BACKGROUND_JOBS=true to enable.");
    return;
  }

  const intervalMinutesRaw = process.env.RECURRING_INVOICES_JOB_INTERVAL_MINUTES || "60";
  const intervalMinutes = Math.max(5, Number(intervalMinutesRaw) || 60);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[JOBS] Recurring invoices job enabled (every ${intervalMinutes} minutes).`);

  const run = async () => {
    try {
      await processRecurringInvoices();
    } catch (error: any) {
      console.error("[JOBS] Recurring invoices job failed:", error?.message || error);
    }
  };

  // Run once at startup, then on interval.
  run();
  const timer = setInterval(run, intervalMs);
  (timer as any).unref?.();
};

// Initialize debug mode based on environment variable
// Set DEBUG=true in .env to enable debug logging
// You can also set individual debug types:
//   DEBUG_REQUESTS=true - Log all requests
//   DEBUG_RESPONSES=true - Log all responses  
//   DEBUG_ERRORS=true - Log all errors
//   DEBUG_DATABASE=true - Log database operations
if (process.env.DEBUG === 'true' || process.env.DEBUG === '1' || process.env.DEBUG === 'yes') {
  enableDebug();
  console.log('🔍 Debug logging is ENABLED');
  console.log('   - Requests:', process.env.DEBUG_REQUESTS !== 'false');
  console.log('   - Responses:', process.env.DEBUG_RESPONSES !== 'false');
  console.log('   - Errors:', process.env.DEBUG_ERRORS !== 'false');
  console.log('   - Database:', process.env.DEBUG_DATABASE !== 'false');
} else {
  disableDebug();
  console.log('🔍 Debug logging is DISABLED');
  console.log('   Set DEBUG=true in .env to enable debug logging');
  console.log('   Or set individual flags: DEBUG_REQUESTS, DEBUG_RESPONSES, DEBUG_ERRORS, DEBUG_DATABASE');
}

// Expose debug control via process signals (optional)
// Send SIGUSR2 to toggle debug mode: kill -SIGUSR2 <PID>
process.on('SIGUSR2', () => {
  if (isDebugEnabled()) {
    disableDebug();
    console.log('🔍 Debug mode toggled OFF');
  } else {
    enableDebug();
    console.log('🔍 Debug mode toggled ON');
  }
});

// Connect to database
connectDB(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taban_books")
  .then(async () => {
    // Fix DB Indexes
    await fixJournalEntryIndex();
    await fixCreditNoteIndex();
    await ensurePerformanceIndexes();

    scheduleRemindersJob();
    scheduleRecurringInvoicesJob();

    // Start server - listen on all interfaces (0.0.0.0) to allow localhost connections
    app.listen(PORT, '0.0.0.0', () => {
      // #region agent log
      const logToFile = (data: any) => {
        const logPath = path.join(__dirname, '../.cursor/debug.log');
        const logLine = JSON.stringify({ ...data, timestamp: Date.now() }) + '\n';
        try { fs.appendFileSync(logPath, logLine); } catch (e) { }
      };
      logToFile({ location: 'server.ts:53', message: 'Server started listening', data: { port: PORT, host: '0.0.0.0' }, sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' });
      // #endregion
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`🌐 API: http://127.0.0.1:${PORT}/api`);
    });
  })
  .catch((error: Error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

