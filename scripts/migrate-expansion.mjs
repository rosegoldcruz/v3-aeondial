import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE entity_status AS ENUM ('active','archived','deleted','draft','pending','on_hold');
        CREATE TYPE priority_level AS ENUM ('low','medium','high','critical');
        CREATE TYPE view_type AS ENUM ('table','kanban','calendar','timeline','gantt');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Read and execute expansion SQL
    const sql = fs.readFileSync("database/schema-os-expansion.sql", "utf8");
    await client.query(sql);

    await client.query("COMMIT");
    console.log("✓ Schema expansion applied successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}
run();
