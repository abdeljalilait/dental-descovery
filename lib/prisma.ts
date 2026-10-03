import { db } from "@/src/prisma/db";

/**
 * App-facing singleton for the Prisma 8 client.
 *
 * The façade is lazy: `db.sql` and `db.orm` are usable immediately, and the
 * driver/pool is created on the first query that needs it. Never call
 * `db.close()` from a request handler — the pool lives for the process
 * lifetime. Close it only in short-lived scripts (seed, CLI, cron) so Node can
 * exit.
 */
export { db };
export default db;