/**
 * Autonomous Digital Agency — Data Layer
 * All SQL queries for the agency module. Org-scoped.
 */

import { query, one } from "@/lib/db/pool";
import type {
  AgencyBusiness, AgencyScore, AgencyPreview,
  AgencyCampaign, AgencyOpportunity, AgencyAgentLog,
} from "@/types/models";

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface AgencyStats {
  total_businesses: number;
  total_scored: number;
  total_previews: number;
  total_campaigns: number;
  pipeline_value_low: number;
  pipeline_value_high: number;
  stage_counts: Record<string, number>;
  class_counts: Record<string, number>;
}

export async function getAgencyStats(orgId: string): Promise<AgencyStats> {
  const [biz, scored, previews, campaigns, pipeline, stages, classes] = await Promise.all([
    one<{ count: number }>("SELECT COUNT(*)::int AS count FROM agency_businesses WHERE org_id=$1", [orgId]),
    one<{ count: number }>("SELECT COUNT(*)::int AS count FROM agency_scores WHERE org_id=$1", [orgId]),
    one<{ count: number }>("SELECT COUNT(*)::int AS count FROM agency_previews WHERE org_id=$1", [orgId]),
    one<{ count: number }>("SELECT COUNT(*)::int AS count FROM agency_campaigns WHERE org_id=$1", [orgId]),
    one<{ low: number; high: number }>(
      "SELECT COALESCE(SUM(revenue_low_cents),0)::int AS low, COALESCE(SUM(revenue_high_cents),0)::int AS high FROM agency_opportunities WHERE org_id=$1 AND stage NOT IN ('WON','LOST')",
      [orgId]
    ),
    query<{ stage: string; count: number }>(
      "SELECT stage, COUNT(*)::int AS count FROM agency_opportunities WHERE org_id=$1 GROUP BY stage",
      [orgId]
    ),
    query<{ classification: string; count: number }>(
      "SELECT classification::text, COUNT(*)::int AS count FROM agency_scores WHERE org_id=$1 GROUP BY classification",
      [orgId]
    ),
  ]);

  const stage_counts: Record<string, number> = {};
  stages.forEach((r) => { stage_counts[r.stage] = r.count; });
  const class_counts: Record<string, number> = {};
  classes.forEach((r) => { class_counts[r.classification] = r.count; });

  return {
    total_businesses: biz?.count ?? 0,
    total_scored: scored?.count ?? 0,
    total_previews: previews?.count ?? 0,
    total_campaigns: campaigns?.count ?? 0,
    pipeline_value_low: pipeline?.low ?? 0,
    pipeline_value_high: pipeline?.high ?? 0,
    stage_counts,
    class_counts,
  };
}

// ─── Businesses ──────────────────────────────────────────────────────────────

export async function listBusinesses(orgId: string, limit = 50, offset = 0): Promise<AgencyBusiness[]> {
  return query<AgencyBusiness>(
    `SELECT * FROM agency_businesses WHERE org_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );
}

export async function getBusinessById(orgId: string, id: string): Promise<AgencyBusiness | null> {
  return one<AgencyBusiness>(
    "SELECT * FROM agency_businesses WHERE org_id=$1 AND id=$2",
    [orgId, id]
  );
}

export async function createBusiness(data: {
  org_id: string; business_name: string; category?: string;
  city?: string; state?: string; phone?: string; email?: string;
  website?: string; domain?: string; rating?: number; review_count?: number;
  source?: string; source_tier?: string;
}): Promise<AgencyBusiness | null> {
  return one<AgencyBusiness>(
    `INSERT INTO agency_businesses (org_id, business_name, category, city, state, phone, email, website, domain, rating, review_count, source, source_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [data.org_id, data.business_name, data.category ?? null, data.city ?? null, data.state ?? null,
     data.phone ?? null, data.email ?? null, data.website ?? null, data.domain ?? null,
     data.rating ?? null, data.review_count ?? 0, data.source ?? null, data.source_tier ?? null]
  );
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export async function getScoreForBusiness(orgId: string, businessId: string): Promise<AgencyScore | null> {
  return one<AgencyScore>(
    "SELECT * FROM agency_scores WHERE org_id=$1 AND business_id=$2 ORDER BY scored_at DESC LIMIT 1",
    [orgId, businessId]
  );
}

// ─── Previews ────────────────────────────────────────────────────────────────

export async function listPreviews(orgId: string, limit = 50): Promise<AgencyPreview[]> {
  return query<AgencyPreview>(
    "SELECT * FROM agency_previews WHERE org_id=$1 ORDER BY created_at DESC LIMIT $2",
    [orgId, limit]
  );
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function listCampaigns(orgId: string): Promise<AgencyCampaign[]> {
  return query<AgencyCampaign>(
    "SELECT * FROM agency_campaigns WHERE org_id=$1 ORDER BY created_at DESC",
    [orgId]
  );
}

// ─── Opportunities / Pipeline ────────────────────────────────────────────────

export async function listOpportunities(orgId: string, stage?: string): Promise<AgencyOpportunity[]> {
  if (stage) {
    return query<AgencyOpportunity>(
      "SELECT * FROM agency_opportunities WHERE org_id=$1 AND stage=$2 ORDER BY priority_score DESC, created_at DESC",
      [orgId, stage]
    );
  }
  return query<AgencyOpportunity>(
    "SELECT * FROM agency_opportunities WHERE org_id=$1 ORDER BY priority_score DESC, created_at DESC LIMIT 200",
    [orgId]
  );
}

export async function updateOpportunityStage(orgId: string, id: string, stage: string): Promise<AgencyOpportunity | null> {
  return one<AgencyOpportunity>(
    "UPDATE agency_opportunities SET stage=$3, updated_at=now() WHERE org_id=$1 AND id=$2 RETURNING *",
    [orgId, id, stage]
  );
}

// ─── Agent Logs ──────────────────────────────────────────────────────────────

export async function listAgentLogs(orgId: string, limit = 50): Promise<AgencyAgentLog[]> {
  return query<AgencyAgentLog>(
    "SELECT * FROM agency_agent_logs WHERE org_id=$1 ORDER BY logged_at DESC LIMIT $2",
    [orgId, limit]
  );
}

export async function logAgentAction(data: {
  org_id: string; agent_name: string; action: string;
  target_id?: string; target_type?: string;
  payload?: Record<string, unknown>; result?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO agency_agent_logs (org_id, agent_name, action, target_id, target_type, payload, result)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [data.org_id, data.agent_name, data.action, data.target_id ?? null,
     data.target_type ?? null, JSON.stringify(data.payload ?? null), JSON.stringify(data.result ?? null)]
  );
}
