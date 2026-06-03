import { Pool, type QueryResultRow } from "pg";

// Lazy single shared pool. Never connects at build/import time —
// only on first query. Reused across hot reloads in dev via globalThis.
const globalForPg = globalThis as unknown as { aeonPool?: Pool };

function getPool(): Pool {
  if (globalForPg.aeonPool) return globalForPg.aeonPool;
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("Missing required env var: POSTGRES_URL");
  const p = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForPg.aeonPool = p;
  return p;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows as T[];
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
