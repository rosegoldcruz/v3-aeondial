import { generateText } from "ai";
import { aeonModel } from "@/lib/ai/client";
import { one, query } from "@/lib/db/pool";
import type { Lead, LeadActivity, User } from "@/types/models";

export interface NamedLead extends Lead {
  owner_name: string | null;
  activity_count: number;
}

export interface LeadWithActivities extends NamedLead {
  activities: (LeadActivity & { user_name: string | null })[];
}

export interface LeadListResult {
  leads: NamedLead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeadPoolStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  stale: number;
  revenuePotentialCents: number;
  avgScore: number;
  noActivity7d: number;
  campaignLeads: number;
}

export type LeadSort = "score" | "name" | "created_at" | "last_contacted_at";
export type LeadFilter =
  | "all"
  | "hot"
  | "warm"
  | "cold"
  | "new_today"
  | "no_contact"
  | "my";

const PAGE_SIZE = 20;
const DEFAULT_VALUE_CENTS = 500_000;

export async function listOrgUsers(orgId: string): Promise<Pick<User, "id" | "name" | "email">[]> {
  return query(`SELECT id, name, email FROM users WHERE org_id=$1 AND active=true ORDER BY name`, [orgId]);
}

export async function getLeadPoolStats(orgId: string): Promise<LeadPoolStats> {
  const row = await one<{
    total: string;
    hot: string;
    warm: string;
    cold: string;
    stale: string;
    avg_score: string;
    no_activity: string;
    campaign_leads: string;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE score_tier='hot')::int AS hot,
       COUNT(*) FILTER (WHERE score_tier='warm')::int AS warm,
       COUNT(*) FILTER (WHERE score_tier='cold')::int AS cold,
       COUNT(*) FILTER (WHERE last_contacted_at IS NULL OR last_contacted_at < now() - interval '7 days')::int AS stale,
       COALESCE(ROUND(AVG(score)),0)::int AS avg_score,
       COUNT(*) FILTER (WHERE last_contacted_at IS NULL OR last_contacted_at < now() - interval '7 days')::int AS no_activity,
       COUNT(*) FILTER (WHERE campaign IS NOT NULL AND campaign <> '')::int AS campaign_leads
     FROM leads WHERE org_id=$1`,
    [orgId]
  );
  const total = Number(row?.total ?? 0);
  return {
    total,
    hot: Number(row?.hot ?? 0),
    warm: Number(row?.warm ?? 0),
    cold: Number(row?.cold ?? 0),
    stale: Number(row?.stale ?? 0),
    revenuePotentialCents: total * DEFAULT_VALUE_CENTS,
    avgScore: Number(row?.avg_score ?? 0),
    noActivity7d: Number(row?.no_activity ?? 0),
    campaignLeads: Number(row?.campaign_leads ?? 0),
  };
}

function buildListWhere(
  orgId: string,
  opts: {
    filter?: LeadFilter;
    search?: string;
    status?: string;
    ownerId?: string | null;
    currentUserId?: string | null;
  },
): { sql: string; params: unknown[] } {
  const params: unknown[] = [orgId];
  const clauses = ["l.org_id=$1"];
  let n = 2;

  const filter = opts.filter ?? "all";
  if (filter === "hot") clauses.push(`l.score_tier='hot'`);
  else if (filter === "warm") clauses.push(`l.score_tier='warm'`);
  else if (filter === "cold") clauses.push(`l.score_tier='cold'`);
  else if (filter === "new_today") clauses.push(`l.created_at >= CURRENT_DATE`);
  else if (filter === "no_contact") {
    clauses.push(`(l.last_contacted_at IS NULL OR l.last_contacted_at < now() - interval '7 days')`);
  } else if (filter === "my" && opts.currentUserId) {
    clauses.push(`l.owner_id=$${n}`);
    params.push(opts.currentUserId);
    n++;
  }

  if (opts.status && opts.status !== "all") {
    clauses.push(`l.status=$${n}`);
    params.push(opts.status);
    n++;
  }

  if (opts.search?.trim()) {
    clauses.push(`(
      l.name ILIKE $${n} OR l.company ILIKE $${n} OR l.email ILIKE $${n} OR l.phone ILIKE $${n}
    )`);
    params.push(`%${opts.search.trim()}%`);
    n++;
  }

  return { sql: clauses.join(" AND "), params };
}

function sortClause(sort: LeadSort): string {
  if (sort === "name") return "l.name ASC";
  if (sort === "created_at") return "l.created_at DESC";
  if (sort === "last_contacted_at") return "l.last_contacted_at DESC NULLS LAST";
  return "l.score DESC, l.updated_at DESC";
}

export async function listLeads(
  orgId: string,
  opts: {
    filter?: LeadFilter;
    search?: string;
    status?: string;
    sort?: LeadSort;
    page?: number;
    currentUserId?: string | null;
  } = {},
): Promise<LeadListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const sort = opts.sort ?? "score";
  const { sql: whereSql, params } = buildListWhere(orgId, opts);
  const offset = (page - 1) * PAGE_SIZE;

  const countRow = await one<{ c: string }>(
    `SELECT COUNT(*)::int AS c FROM leads l WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRow?.c ?? 0);

  const leads = await query<NamedLead>(
    `SELECT l.*, u.name AS owner_name,
            (SELECT COUNT(*)::int FROM lead_activities la WHERE la.lead_id=l.id) AS activity_count
     FROM leads l
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE ${whereSql}
     ORDER BY ${sortClause(sort)}
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params,
  );

  return { leads, total, page, pageSize: PAGE_SIZE };
}

export async function getLeadWithActivities(orgId: string, leadId: string): Promise<LeadWithActivities | null> {
  const lead = await one<NamedLead>(
    `SELECT l.*, u.name AS owner_name,
            (SELECT COUNT(*)::int FROM lead_activities la WHERE la.lead_id=l.id) AS activity_count
     FROM leads l
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.org_id=$1 AND l.id=$2`,
    [orgId, leadId],
  );
  if (!lead) return null;

  const activities = await query<LeadActivity & { user_name: string | null }>(
    `SELECT la.*, u.name AS user_name
     FROM lead_activities la
     LEFT JOIN users u ON u.id = la.user_id
     WHERE la.org_id=$1 AND la.lead_id=$2
     ORDER BY la.occurred_at DESC`,
    [orgId, leadId],
  );

  return { ...lead, activities };
}

export interface CreateLeadInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  campaign?: string | null;
  status?: string;
  owner_id?: string | null;
  budget_range?: string | null;
  pain_points?: string | null;
  decision_timeline?: string | null;
  tags?: string[];
  notes?: string | null;
}

export async function createLead(orgId: string, input: CreateLeadInput): Promise<NamedLead> {
  const lead = await one<Lead>(
    `INSERT INTO leads (
       org_id, name, company, email, phone, status, source, campaign,
       owner_id, budget_range, pain_points, decision_timeline, tags, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      orgId,
      input.name,
      input.company ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.status ?? "new",
      input.source ?? null,
      input.campaign ?? null,
      input.owner_id ?? null,
      input.budget_range ?? null,
      input.pain_points ?? null,
      input.decision_timeline ?? null,
      input.tags ?? [],
      input.notes ?? null,
    ],
  );
  if (!lead) throw new Error("insert failed");
  await recomputeLeadScore(orgId, lead.id);
  const named = await one<NamedLead>(
    `SELECT l.*, u.name AS owner_name,
            (SELECT COUNT(*)::int FROM lead_activities la WHERE la.lead_id=l.id) AS activity_count
     FROM leads l LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.org_id=$1 AND l.id=$2`,
    [orgId, lead.id],
  );
  if (!named) throw new Error("lead missing after insert");
  return named;
}

export async function updateLead(
  orgId: string,
  leadId: string,
  patch: Partial<CreateLeadInput> & { sentiment?: string; notes?: string | null },
): Promise<LeadWithActivities | null> {
  const existing = await one<Lead>("SELECT * FROM leads WHERE org_id=$1 AND id=$2", [orgId, leadId]);
  if (!existing) return null;

  const columns: Record<string, unknown> = {
    name: patch.name,
    company: patch.company,
    email: patch.email,
    phone: patch.phone,
    status: patch.status,
    source: patch.source,
    campaign: patch.campaign,
    owner_id: patch.owner_id,
    budget_range: patch.budget_range,
    pain_points: patch.pain_points,
    decision_timeline: patch.decision_timeline,
    tags: patch.tags,
    notes: patch.notes,
    sentiment: patch.sentiment,
  };

  const sets: string[] = [];
  const params: unknown[] = [orgId, leadId];
  let n = 3;
  for (const [col, val] of Object.entries(columns)) {
    if (val !== undefined) {
      sets.push(`${col}=$${n}`);
      params.push(val);
      n++;
    }
  }
  if (sets.length) {
    await query(`UPDATE leads SET ${sets.join(", ")}, updated_at=now() WHERE org_id=$1 AND id=$2`, params);
    await recomputeLeadScore(orgId, leadId);
  }
  return getLeadWithActivities(orgId, leadId);
}

export async function deleteLead(orgId: string, leadId: string): Promise<boolean> {
  const row = await one("DELETE FROM leads WHERE org_id=$1 AND id=$2 RETURNING id", [orgId, leadId]);
  return Boolean(row);
}

export async function logLeadActivity(
  orgId: string,
  leadId: string,
  input: {
    kind: string;
    subject?: string | null;
    body?: string | null;
    sentiment?: string;
    duration_seconds?: number | null;
    user_id?: string | null;
  },
): Promise<{ activity: LeadActivity; lead: NamedLead; score: { score: number; tier: string; explanation: string } }> {
  const activity = await one<LeadActivity>(
    `INSERT INTO lead_activities (org_id, lead_id, kind, subject, body, sentiment, duration_seconds, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      orgId,
      leadId,
      input.kind,
      input.subject ?? null,
      input.body ?? null,
      input.sentiment ?? "neutral",
      input.duration_seconds ?? null,
      input.user_id ?? null,
    ],
  );
  if (!activity) throw new Error("activity insert failed");

  await query(
    `UPDATE leads SET last_contacted_at=now(), sentiment=$3, updated_at=now()
     WHERE org_id=$1 AND id=$2`,
    [orgId, leadId, input.sentiment ?? "neutral"],
  );

  const score = await recomputeLeadScore(orgId, leadId);
  const lead = await one<NamedLead>(
    `SELECT l.*, u.name AS owner_name,
            (SELECT COUNT(*)::int FROM lead_activities la WHERE la.lead_id=l.id) AS activity_count
     FROM leads l LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.org_id=$1 AND l.id=$2`,
    [orgId, leadId],
  );
  if (!lead) throw new Error("lead missing");
  return { activity, lead, score };
}

export async function recomputeLeadScore(orgId: string, leadId: string) {
  const lead = await one<Lead>("SELECT * FROM leads WHERE org_id=$1 AND id=$2", [orgId, leadId]);
  if (!lead) throw new Error("lead not found");

  const activities = await query<LeadActivity>(
    "SELECT * FROM lead_activities WHERE lead_id=$1 ORDER BY occurred_at DESC",
    [leadId],
  );

  let score = 0;

  const daysSinceContact = lead.last_contacted_at
    ? (Date.now() - new Date(lead.last_contacted_at).getTime()) / 86_400_000
    : 999;
  if (daysSinceContact < 1) score += 30;
  else if (daysSinceContact < 3) score += 20;
  else if (daysSinceContact < 7) score += 10;

  score += Math.min(activities.length * 4, 20);

  const positiveCount = activities.filter((a) => a.sentiment === "positive").length;
  score += Math.min(positiveCount * 5, 20);

  const negativeCount = activities.filter((a) => a.sentiment === "negative").length;
  score -= negativeCount * 5;

  const statusBonus: Record<string, number> = { new: 5, contacted: 10, qualified: 20, disqualified: 0 };
  score += statusBonus[lead.status] ?? 0;

  if (lead.budget_range) score += 5;
  if (lead.decision_timeline) score += 5;

  score = Math.max(0, Math.min(100, score));
  const tier = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  await query("UPDATE leads SET score=$3, score_tier=$4, updated_at=now() WHERE org_id=$1 AND id=$2", [
    orgId,
    leadId,
    score,
    tier,
  ]);

  const explanation = buildScoreExplanation(score, tier, daysSinceContact, activities.length, lead.status);
  return { score, tier, explanation };
}

function buildScoreExplanation(
  score: number,
  tier: string,
  daysSinceContact: number,
  activityCount: number,
  status: string,
): string {
  const parts: string[] = [];
  if (daysSinceContact < 7) parts.push("recent contact");
  else if (daysSinceContact >= 999) parts.push("no contact logged yet");
  else parts.push(`${Math.floor(daysSinceContact)} days since last touch`);
  if (activityCount > 0) parts.push(`${activityCount} logged interactions`);
  if (status === "qualified") parts.push("qualified status");
  return `Score is ${score} (${tier}) because ${parts.join(", ")}.`;
}

function computedPoolInsight(stats: LeadPoolStats, stagnantCampaign: number): string {
  return `You have ${stats.hot} hot leads (score > 70) and ${stats.warm} warm in the pool — ${stats.noActivity7d} have had no contact in 7+ days. Average score is ${stats.avgScore}. ${stagnantCampaign > 0 ? `${stagnantCampaign} campaign-sourced leads need follow-up.` : "Keep nurturing cold leads with a structured sequence."}`;
}

export async function getLeadPoolInsight(orgId: string): Promise<{ insight: string; source: "ai" | "computed" }> {
  const stats = await getLeadPoolStats(orgId);
  const stagnant = await one<{ c: string }>(
    `SELECT COUNT(*)::int AS c FROM leads
     WHERE org_id=$1 AND campaign IS NOT NULL AND campaign <> ''
       AND (last_contacted_at IS NULL OR last_contacted_at < now() - interval '7 days')`,
    [orgId],
  );
  const stagnantCampaign = Number(stagnant?.c ?? 0);

  if (!process.env.DEEPSEEK_API_KEY) {
    return { insight: computedPoolInsight(stats, stagnantCampaign), source: "computed" };
  }

  try {
    const { text } = await generateText({
      model: aeonModel(),
      system:
        "You are AEON lead intelligence. Write 1-2 direct sentences about the lead pool. Use exact counts. Be actionable. No bullets.",
      prompt: JSON.stringify({ ...stats, stagnantCampaign }),
    });
    return { insight: text, source: "ai" };
  } catch {
    return { insight: computedPoolInsight(stats, stagnantCampaign), source: "computed" };
  }
}

function computedLeadInsight(lead: Lead): string {
  const days = lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86_400_000)
    : null;
  if (lead.sentiment === "negative") {
    return "Sentiment is negative — address objections and confirm budget before the next call.";
  }
  if (days === null || days > 5) {
    return `No recent contact${days ? ` (${days} days)` : ""} — schedule a follow-up while score is ${lead.score}.`;
  }
  if (lead.pain_points?.toLowerCase().includes("budget")) {
    return "Budget concerns noted — consider offering a payment plan before the next call.";
  }
  return `Maintain momentum with a ${lead.score_tier} lead — personalize outreach around ${lead.decision_timeline ?? "their timeline"}.`;
}

export async function getLeadInsight(orgId: string, leadId: string): Promise<{ insight: string; source: "ai" | "computed" }> {
  const lead = await one<Lead>("SELECT * FROM leads WHERE org_id=$1 AND id=$2", [orgId, leadId]);
  if (!lead) return { insight: "Lead not found.", source: "computed" };

  if (!process.env.DEEPSEEK_API_KEY) {
    return { insight: computedLeadInsight(lead), source: "computed" };
  }

  try {
    const { text } = await generateText({
      model: aeonModel(),
      system: "You are AEON. One sentence recommendation for this lead. Be specific and actionable.",
      prompt: JSON.stringify({
        name: lead.name,
        score: lead.score,
        tier: lead.score_tier,
        status: lead.status,
        sentiment: lead.sentiment,
        last_contacted_at: lead.last_contacted_at,
        pain_points: lead.pain_points,
        notes: lead.notes,
        budget_range: lead.budget_range,
      }),
    });
    return { insight: text, source: "ai" };
  } catch {
    return { insight: computedLeadInsight(lead), source: "computed" };
  }
}

export function leadResponseRate(activities: LeadActivity[]): number {
  if (!activities.length) return 0;
  const positive = activities.filter((a) => a.sentiment === "positive").length;
  return Math.round((positive / activities.length) * 100);
}