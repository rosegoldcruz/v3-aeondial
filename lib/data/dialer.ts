/**
 * AEON Dial v3 — Dialer data layer
 * All SQL for the dialer module. Org-scoped.
 */

import { query, one } from "@/lib/db/pool";
import type { Call } from "@/types/models";

export async function getRecentCalls(orgId: string, limit = 50): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [orgId, limit]
  );
}

export async function getActiveCalls(orgId: string): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 AND status IN ('initiated','ringing','answered') ORDER BY started_at DESC`,
    [orgId]
  );
}

export async function getCallById(orgId: string, callId: string): Promise<Call | null> {
  return one<Call>(
    `SELECT * FROM calls WHERE org_id = $1 AND id = $2`,
    [orgId, callId]
  );
}

export async function getCallStats(orgId: string) {
  const row = await one<{
    total_today: number;
    active_count: number;
    avg_duration: number;
    connect_rate: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) AS total_today,
       COUNT(*) FILTER (WHERE status IN ('initiated','ringing','answered')) AS active_count,
       COALESCE(AVG(duration_s) FILTER (WHERE duration_s IS NOT NULL), 0)::int AS avg_duration,
       CASE WHEN COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) > 0
         THEN (COUNT(*) FILTER (WHERE status = 'completed' AND started_at >= CURRENT_DATE) * 100
               / COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE))
         ELSE 0 END AS connect_rate
     FROM calls WHERE org_id = $1`,
    [orgId]
  );
  return row || { total_today: 0, active_count: 0, avg_duration: 0, connect_rate: 0 };
}

export async function getCallsByLead(orgId: string, leadId: string): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 AND lead_id = $2 ORDER BY started_at DESC`,
    [orgId, leadId]
  );
}

export async function getCallsByContact(orgId: string, contactId: string): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 AND contact_id = $2 ORDER BY started_at DESC`,
    [orgId, contactId]
  );
}
