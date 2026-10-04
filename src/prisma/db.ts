import { config } from 'dotenv';
import { Temporal } from 'temporal-polyfill';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from '../../prisma/contract.d';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

config({ path: '.env.local' });
config();

/**
 * Prisma's `timestamptz` temporal codec reads and writes values through the
 * global `Temporal` API. That global is only present on runtimes shipping the
 * proposal natively (Node 26+), so on the LTS runtime the container runs on the
 * codec would throw `RUNTIME.TEMPORAL_UNAVAILABLE` while decoding a row.
 *
 * Installing the polyfill as the global keeps one code path across dev, the
 * build step and production. `globalThis.Temporal` is only assigned when the
 * runtime does not already provide it.
 */
if (typeof globalThis.Temporal === "undefined") {
  // The polyfill implements the same surface the codec calls; the cast is only
  // needed because the ambient lib types describe the native global.
  (globalThis as unknown as { Temporal: typeof Temporal }).Temporal = Temporal;
}

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});