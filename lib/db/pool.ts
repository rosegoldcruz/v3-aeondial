import { Pool, types, type QueryResultRow } from "pg";

// Parse bigint (int8) columns as numbers to prevent string concatenation bugs.
// This is safe because deal/subscription values in cents fit comfortably in
// JavaScript's Number (up to ~$90 quadrillion safely).
types.setTypeParser(20, (val: string) => Number(val)); // int8 → number

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
    min: 2,                    // keep 2 connections warm so first query is never cold
    idleTimeoutMillis: 60_000, // hold idle connections longer to avoid churn
    connectionTimeoutMillis: 5_000,
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
