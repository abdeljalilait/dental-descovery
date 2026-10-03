// Type-only so this module stays importable from plain Node ESM (seed scripts)
// without requiring the bundler's extension-less resolution.
import type { db } from "./db";

/**
 * Minimal ambient typing for the `Temporal.Instant` surface this codebase uses.
 *
 * The runtime global exists (Node >= 24), but TypeScript 5.9 ships no Temporal
 * lib definitions. Declaring only what is needed keeps this honest and easy to
 * delete once the toolchain provides the types (or the polyfill is installed).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Temporal {
    interface Instant {
      toString(): string;
    }
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Instant {
      function from(value: string | Date | number): Instant;
    }
  }
}

type ClinicCreate = Parameters<typeof db.orm.public.Clinic.create>[0];

/** Accepted input type for the contract's `timestamptz` (temporal codec) columns. */
export type InstantInput = NonNullable<ClinicCreate["lastSyncedAt"]>;
/** Accepted input type for the contract's `jsonb` columns. */
export type JsonInput = NonNullable<ClinicCreate["hours"]>;

/** Matches a bare calendar date such as `2026-08-28`, with no time or offset. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a `Temporal.Instant` from an ISO string, a `Date`, or epoch millis.
 *
 * The `timestamptz` columns in this contract map to the temporal codec, which
 * encodes `Temporal.Instant` and throws `RUNTIME.ENCODE_FAILED` when handed a
 * JavaScript `Date`. `Temporal.Instant.from` additionally requires a full
 * instant, while this codebase stores `lastSyncedAt` as a bare calendar date
 * (see `Clinic` in `lib/data/types.ts`), so a date-only value is anchored to
 * midnight UTC. Returns the type the ORM input actually accepts so call sites
 * need no cast of their own.
 *
 * `Date` is normalised to ISO first: `Temporal.Instant.from` parses its input as
 * a string, and `Date.prototype.toString()` yields a human-readable form
 * ("Fri Oct 03 2026 17:45:00 GMT+0100") that it rejects with
 * "Invalid character while parsing year value".
 */
export function toInstant(value: string | Date | number): InstantInput {
  const iso =
    typeof value === "string" && DATE_ONLY.test(value)
      ? `${value}T00:00:00Z`
      : value instanceof Date
        ? value.toISOString()
        : value;

  return Temporal.Instant.from(iso) as InstantInput;
}

/**
 * Cast a plain object/array literal to a `jsonb` input.
 *
 * `JsonInput` is a recursive union with an index signature, so ordinary
 * interfaces without one (`ClinicHourRow[]`) are structurally rejected even
 * though they are valid JSON. The runtime value is already JSON-serialisable.
 */
export function toJson<T>(value: T): JsonInput {
  return value as JsonInput;
}