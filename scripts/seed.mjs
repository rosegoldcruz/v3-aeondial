import { Client } from "pg";

const url = process.env.POSTGRES_URL;
if (!url) { console.error("Missing required env var: POSTGRES_URL"); process.exit(1); }

const client = new Client({ connectionString: url });
await client.connect();

try {
  // Org
  const org = (await client.query(
    `INSERT INTO orgs (name, slug) VALUES ('SNRG Labs','snrg')
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`
  )).rows[0];

  // Entities
  const entityNames = [
    ["SNRG Labs", "SNRG Labs LLC"],
    ["Vulpine Homes", "Vulpine Homes"],
    ["CWV", "Common Wealth Ventures"],
  ];
  const entities = {};
  for (const [name, legal] of entityNames) {
    const r = (await client.query(
      `INSERT INTO entities (org_id, name, legal_name) VALUES ($1,$2,$3)
       ON CONFLICT (org_id, name) DO UPDATE SET legal_name=EXCLUDED.legal_name RETURNING id`,
      [org.id, name, legal]
    )).rows[0];
    entities[name] = r.id;
  }

  // Subscriptions — ported 1:1 from VulpineOps (amounts in cents)
  const subs = [
    ["GitHub Copilot", 4000, "Dev", "SNRG Labs"],
    ["Vercel", 2000, "Dev", "SNRG Labs"],
    ["ChatGPT Plus", 2000, "AI", "SNRG Labs"],
    ["Claude Pro", 2000, "AI", "SNRG Labs"],
    ["Gemini Advanced", 2000, "AI", "SNRG Labs"],
    ["Canva Pro", 2000, "Media", "SNRG Labs"],
    ["CapCut Pro", 2000, "Media", "SNRG Labs"],
    ["ElevenLabs", 2000, "AI Voice", "SNRG Labs"],
    ["DO Droplet (light)", 2000, "Infra", "SNRG Labs"],
    ["DO vici-rocky", 4000, "Infra", "SNRG Labs"],
    ["Neo Email", 1000, "Ops", "Vulpine Homes"],
    ["Windsurf", 1500, "Dev", "SNRG Labs"],
  ];
  for (const [name, cents, cat, ent] of subs) {
    await client.query(
      `INSERT INTO subscriptions (org_id, entity_id, name, amount_cents, category)
       VALUES ($1,$2,$3,$4,$5)`,
      [org.id, entities[ent], name, cents, cat]
    );
  }

  console.log(`✓ seeded org=${org.id} entities=${Object.keys(entities).length} subs=${subs.length}`);
  console.log(`  Set AEON_DEV_ORG_ID=${org.id} to run before ZITADEL wiring.`);
} catch (e) {
  console.error("seed failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
