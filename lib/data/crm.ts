import { query, one } from "@/lib/db/pool";
import type { Contact, Deal, Activity, DealStage } from "@/types/models";

export async function listContacts(orgId: string): Promise<Contact[]> {
  return query<Contact>("SELECT * FROM contacts WHERE org_id=$1 ORDER BY updated_at DESC", [orgId]);
}

export async function listDeals(orgId: string): Promise<Deal[]> {
  return query<Deal>("SELECT * FROM deals WHERE org_id=$1 ORDER BY updated_at DESC", [orgId]);
}

export async function dealsByStage(orgId: string): Promise<Record<DealStage, Deal[]>> {
  const deals = await listDeals(orgId);
  const init: Record<DealStage, Deal[]> = {
    lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [],
  };
  for (const d of deals) init[d.stage].push(d);
  return init;
}

export async function pipelineValueCents(orgId: string): Promise<number> {
  const r = await one<{ sum: string }>(
    "SELECT COALESCE(SUM(value_cents),0) AS sum FROM deals WHERE org_id=$1 AND stage NOT IN ('won','lost')",
    [orgId]
  );
  return Number(r?.sum ?? 0);
}

export async function wonValueCents(orgId: string): Promise<number> {
  const r = await one<{ sum: string }>(
    "SELECT COALESCE(SUM(value_cents),0) AS sum FROM deals WHERE org_id=$1 AND stage='won'",
    [orgId]
  );
  return Number(r?.sum ?? 0);
}

export async function recentActivity(orgId: string, limit = 10): Promise<Activity[]> {
  return query<Activity>(
    "SELECT * FROM activities WHERE org_id=$1 ORDER BY occurred_at DESC LIMIT $2",
    [orgId, limit]
  );
}

export async function createContact(c: {
  org_id: string; name: string; company?: string; email?: string; phone?: string;
}): Promise<Contact> {
  const row = await one<Contact>(
    `INSERT INTO contacts (org_id, name, company, email, phone)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [c.org_id, c.name, c.company ?? null, c.email ?? null, c.phone ?? null]
  );
  return row!;
}

export async function createDeal(d: {
  org_id: string; title: string; contact_id?: string; value_cents: number; stage?: DealStage;
}): Promise<Deal> {
  const row = await one<Deal>(
    `INSERT INTO deals (org_id, title, contact_id, value_cents, stage)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.org_id, d.title, d.contact_id ?? null, d.value_cents, d.stage ?? "lead"]
  );
  return row!;
}

export async function moveDeal(orgId: string, id: string, stage: DealStage): Promise<void> {
  await query("UPDATE deals SET stage=$3 WHERE org_id=$1 AND id=$2", [orgId, id, stage]);
}
