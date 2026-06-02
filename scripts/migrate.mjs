import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.POSTGRES_URL;
if (!url) { console.error("Missing required env var: POSTGRES_URL"); process.exit(1); }

const sql = readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8");
const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log("✓ schema applied");
} catch (e) {
  console.error("migration failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
