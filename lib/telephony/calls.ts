/**
 * Telephony Call State — DB persistence + event loop
 */

import { query, one } from "@/lib/db/pool";
import type { Call } from "@/types/models";

export interface CallRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  provider: string;
  provider_call_id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_s: number | null;
  disposition: string | null;
  recording_url: string | null;
}

let eventLoopStarted = false;

export async function initCallEventLoop(): Promise<void> {
  if (eventLoopStarted) return;
  eventLoopStarted = true;
  // In a real deployment this would start a background worker or
  // ARI websocket. For now we rely on webhooks to update state.
}

export async function createCallRecord(data: {
  org_id: string;
  user_id?: string;
  lead_id?: string;
  contact_id?: string;
  provider: string;
  provider_call_id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: string;
}): Promise<CallRecord> {
  const row = await one<CallRecord>(
    `INSERT INTO calls (org_id, user_id, lead_id, contact_id, provider, provider_call_id, direction, from_number, to_number, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [data.org_id, data.user_id ?? null, data.lead_id ?? null, data.contact_id ?? null,
     data.provider, data.provider_call_id, data.direction, data.from_number, data.to_number, data.status]
  );
  return row!;
}

export async function updateCallByProviderId(
  providerCallId: string,
  updates: Partial<Pick<CallRecord, "status" | "answered_at" | "ended_at" | "duration_s" | "disposition" | "recording_url">>
): Promise<CallRecord | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) { sets.push(`status=$${idx++}`); vals.push(updates.status); }
  if (updates.answered_at !== undefined) { sets.push(`answered_at=$${idx++}`); vals.push(updates.answered_at); }
  if (updates.ended_at !== undefined) { sets.push(`ended_at=$${idx++}`); vals.push(updates.ended_at); }
  if (updates.duration_s !== undefined) { sets.push(`duration_s=$${idx++}`); vals.push(updates.duration_s); }
  if (updates.disposition !== undefined) { sets.push(`disposition=$${idx++}`); vals.push(updates.disposition); }
  if (updates.recording_url !== undefined) { sets.push(`recording_url=$${idx++}`); vals.push(updates.recording_url); }

  if (sets.length === 0) return null;
  vals.push(providerCallId);

  return one<CallRecord>(
    `UPDATE calls SET ${sets.join(", ")}, updated_at=now() WHERE provider_call_id=$${idx} RETURNING *`,
    vals
  );
}

export async function listCalls(orgId: string, limit = 50): Promise<CallRecord[]> {
  return query<CallRecord>(
    `SELECT * FROM calls WHERE org_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit]
  );
}

export async function getCallByProviderId(providerCallId: string): Promise<CallRecord | null> {
  return one<CallRecord>(
    `SELECT * FROM calls WHERE provider_call_id=$1`,
    [providerCallId]
  );
}
