import { query, one } from "@/lib/db/pool";
import type { Entity, Subscription, Transaction } from "@/types/models";

export async function listEntities(orgId: string): Promise<Entity[]> {
  return query<Entity>("SELECT * FROM entities WHERE org_id = $1 ORDER BY name", [orgId]);
}

export async function listSubscriptions(orgId: string, entityId?: string): Promise<Subscription[]> {
  if (entityId) {
    return query<Subscription>(
      "SELECT * FROM subscriptions WHERE org_id = $1 AND entity_id = $2 ORDER BY amount_cents DESC",
      [orgId, entityId]
    );
  }
  return query<Subscription>("SELECT * FROM subscriptions WHERE org_id = $1 ORDER BY amount_cents DESC", [orgId]);
}

export async function createSubscription(s: {
  org_id: string; entity_id: string; name: string; amount_cents: number; category: string;
}): Promise<Subscription> {
  const row = await one<Subscription>(
    `INSERT INTO subscriptions (org_id, entity_id, name, amount_cents, category)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [s.org_id, s.entity_id, s.name, s.amount_cents, s.category]
  );
  return row!;
}

export async function toggleSubscription(orgId: string, id: string): Promise<void> {
  await query("UPDATE subscriptions SET active = NOT active WHERE org_id=$1 AND id=$2", [orgId, id]);
}

export async function deleteSubscription(orgId: string, id: string): Promise<void> {
  await query("DELETE FROM subscriptions WHERE org_id=$1 AND id=$2", [orgId, id]);
}

export async function listTransactions(orgId: string, entityId: string): Promise<Transaction[]> {
  return query<Transaction>(
    "SELECT * FROM transactions WHERE org_id=$1 AND entity_id=$2 ORDER BY occurred_on DESC, created_at DESC",
    [orgId, entityId]
  );
}

export async function createTransaction(t: {
  org_id: string; entity_id: string; description: string; amount_cents: number;
  type: "in" | "out"; category: string; occurred_on: string;
}): Promise<Transaction> {
  const row = await one<Transaction>(
    `INSERT INTO transactions (org_id, entity_id, description, amount_cents, type, category, occurred_on)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [t.org_id, t.entity_id, t.description, t.amount_cents, t.type, t.category, t.occurred_on]
  );
  return row!;
}

// Aggregated burn for an entity: sum of active subscription amounts.
export async function monthlyBurnCents(orgId: string, entityId: string): Promise<number> {
  const r = await one<{ sum: string }>(
    "SELECT COALESCE(SUM(amount_cents),0) AS sum FROM subscriptions WHERE org_id=$1 AND entity_id=$2 AND active=true",
    [orgId, entityId]
  );
  return Number(r?.sum ?? 0);
}

export async function allEntityBurnCents(orgId: string): Promise<number> {
  const r = await one<{ sum: string }>(
    "SELECT COALESCE(SUM(amount_cents),0) AS sum FROM subscriptions WHERE org_id=$1 AND active=true",
    [orgId]
  );
  return Number(r?.sum ?? 0);
}
