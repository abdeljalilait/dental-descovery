/**
 * Dental Discovery - Bree Job Scheduler
 *
 * Runs background jobs in dedicated worker threads without needing system crontab.
 * Usage:
 *   node jobs/index.mjs
 *   npm run worker
 */

import Bree from "bree";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.local then .env using dotenv
dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

/**
 * Default: 03:00 on the 1st of each month.
 *
 * A full sweep costs (cities x dental keywords) searches — 10 cities x 7
 * keywords = 70 — against SerpApi's 250/month free tier. A weekly schedule
 * would land around 300/month and exhaust the quota, so the default is monthly.
 * The job also enforces the budget at runtime via SearchBudget, so raising this
 * cadence can only shorten a run, never overspend the quota.
 */
const cronSchedule = process.env.SYNC_CRON_SCHEDULE || "0 3 1 * *";

const bree = new Bree({
  root: __dirname,
  defaultExtension: "mjs",
  jobs: [
    {
      name: "sync-clinics",
      cron: cronSchedule,
      // Optional: run immediately on worker startup if configured
      ...(process.env.RUN_SYNC_ON_STARTUP === "true" ? { timeout: "5s" } : {}),
    },
  ],
  errorHandler: (error, workerMetadata) => {
    console.error(`[Bree:error] Worker "${workerMetadata.name}" failed:`, error);
  },
  workerMessageHandler: ({ name, message }) => {
    console.log(`[Bree:worker:${name}]`, message);
  },
});

// Lifecycle events
bree.on("worker created", (name) => {
  console.log(`[Bree] Started worker: ${name} (PID: ${process.pid})`);
});

bree.on("worker deleted", (name) => {
  console.log(`[Bree] Finished worker: ${name}`);
});

// Start Bree
async function start() {
  console.log("======================================================");
  console.log("  Dental Discovery - Bree Background Scheduler");
  console.log(`  Schedule for 'sync-clinics': ${cronSchedule}`);
  console.log("======================================================");

  await bree.start();
}

start().catch((err) => {
  console.error("[Bree] Failed to start scheduler:", err);
  process.exit(1);
});

// Graceful shutdown handlers
async function handleShutdown(signal) {
  console.log(`\n[Bree] Received ${signal}. Gracefully stopping all worker threads...`);
  await bree.stop();
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
