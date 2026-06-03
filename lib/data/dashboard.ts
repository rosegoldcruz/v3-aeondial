import { generateText } from "ai";
import { aeonModel } from "@/lib/ai/client";
import { query, one } from "@/lib/db/pool";

/* ------------------------------------------------------------------ */
/*  KPI data — all 6 Pulse Row cards                                   */
/* ------------------------------------------------------------------ */

export interface DashboardKPIs {
  pipelineValueCents: number;
  wonThisMonthCents: number;
  monthlyBurnCents: number;
  newLeadsCount: number;
  conversionRate: number; // 0–100
  openTasksCount: number;
}

export async function getDashboardKPIs(orgId: string): Promise<DashboardKPIs> {
  const [pipeline, won, burn, leads, tasks, conv] = await Promise.all([
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage NOT IN ('won','lost')`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage='won'
         AND updated_at >= date_trunc('month', now())`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COALESCE(SUM(amount_cents),0) AS v FROM subscriptions
       WHERE org_id=$1 AND active=true`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COUNT(*) AS v FROM leads
       WHERE org_id=$1 AND created_at > now() - interval '7 days'`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COUNT(*) AS v FROM tasks
       WHERE org_id=$1 AND status != 'done'`,
      [orgId]
    ),
    one<{ won: string; total: string }>(
      `SELECT
         COALESCE(SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END),0) AS won,
         COUNT(*) AS total
       FROM deals WHERE org_id=$1
         AND expected_close IS NOT NULL
         AND expected_close >= date_trunc('month', CURRENT_DATE)::date
         AND expected_close < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date`,
      [orgId]
    ),
  ]);

  const wonCount = Number((conv as any)?.won ?? 0);
  const totalCount = Number((conv as any)?.total ?? 0);
  const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  return {
    pipelineValueCents: Number((pipeline as any)?.v ?? 0),
    wonThisMonthCents: Number((won as any)?.v ?? 0),
    monthlyBurnCents: Number((burn as any)?.v ?? 0),
    newLeadsCount: Number((leads as any)?.v ?? 0),
    conversionRate,
    openTasksCount: Number((tasks as any)?.v ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Stage breakdown                                                    */
/* ------------------------------------------------------------------ */

export interface StageBreakdown {
  lead: number;
  qualified: number;
  proposal: number;
  negotiation: number;
  won: number;
  lost: number;
}

export async function getStageBreakdown(orgId: string): Promise<StageBreakdown> {
  const row = await one<StageBreakdown>(
    `SELECT
       COALESCE(SUM(CASE WHEN stage='lead' THEN 1 ELSE 0 END),0) AS lead,
       COALESCE(SUM(CASE WHEN stage='qualified' THEN 1 ELSE 0 END),0) AS qualified,
       COALESCE(SUM(CASE WHEN stage='proposal' THEN 1 ELSE 0 END),0) AS proposal,
       COALESCE(SUM(CASE WHEN stage='negotiation' THEN 1 ELSE 0 END),0) AS negotiation,
       COALESCE(SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END),0) AS won,
       COALESCE(SUM(CASE WHEN stage='lost' THEN 1 ELSE 0 END),0) AS lost
     FROM deals WHERE org_id=$1`,
    [orgId]
  );
  return row ?? { lead: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 };
}

/* ------------------------------------------------------------------ */
/*  Priority Actions                                                   */
/* ------------------------------------------------------------------ */

export interface PriorityAction {
  severity: "URGENT" | "HIGH" | "INFO";
  text: string;
  href: string;
}

export async function getPriorityActions(orgId: string): Promise<PriorityAction[]> {
  const actions: PriorityAction[] = [];

  // 1. Stale leads: contacted > 5 days ago
  const staleLeads = await query<{ name: string; updated_at: string }>(
    `SELECT name, updated_at FROM leads
     WHERE org_id=$1 AND status='contacted'
       AND updated_at < now() - interval '5 days'
     ORDER BY updated_at LIMIT 3`,
    [orgId]
  );
  for (const lead of staleLeads) {
    const days = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86_400_000);
    actions.push({
      severity: "HIGH",
      text: `Follow up with ${lead.name} — last contact was ${days} days ago`,
      href: "/crm/leads",
    });
  }

  // 2. Pipeline stage drop-off: proposal < qualified * 0.5
  const stages = await getStageBreakdown(orgId);
  if (stages.qualified > 0 && stages.proposal < stages.qualified * 0.5) {
    const dropPct = stages.qualified > 0 ? Math.round((1 - stages.proposal / stages.qualified) * 100) : 0;
    actions.push({
      severity: "HIGH",
      text: `Proposal stage has a ${dropPct}% drop-off. Review your templates`,
      href: "/crm/campaigns",
    });
  }

  // 3. Stagnant negotiation deals: updated > 7 days ago
  const stagnant = await one<{ v: string }>(
    `SELECT COUNT(*) AS v FROM deals
     WHERE org_id=$1 AND stage='negotiation'
       AND updated_at < now() - interval '7 days'`,
    [orgId]
  );
  const stagnantCount = Number((stagnant as any)?.v ?? 0);
  if (stagnantCount > 0) {
    actions.push({
      severity: "URGENT",
      text: `${stagnantCount} deals stagnant in Negotiation — nudge the owners`,
      href: "/crm/deals",
    });
  }

  // 4. Overdue tasks
  const overdue = await one<{ v: string }>(
    `SELECT COUNT(*) AS v FROM tasks
     WHERE org_id=$1 AND status != 'done' AND due_date < CURRENT_DATE`,
    [orgId]
  );
  const overdueCount = Number((overdue as any)?.v ?? 0);
  if (overdueCount > 0) {
    actions.push({
      severity: "HIGH",
      text: `${overdueCount} overdue tasks need attention`,
      href: "/ops/tasks",
    });
  }

  // 5. DNC compliance — empty dnc_numbers but campaigns exist
  const cCount = await one<{ v: string }>(
    `SELECT COUNT(*) AS v FROM campaigns WHERE org_id=$1 AND type='dialer'`,
    [orgId]
  );
  const dncCount = await one<{ v: string }>(
    `SELECT COUNT(*) AS v FROM dnc_numbers WHERE org_id=$1`,
    [orgId]
  );
  if (Number((cCount as any)?.v ?? 0) > 0 && Number((dncCount as any)?.v ?? 0) === 0) {
    actions.push({
      severity: "INFO",
      text: "No DNC list uploaded — required before dialing",
      href: "/dialer/compliance",
    });
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  Recent Deals (5 most recent)                                       */
/* ------------------------------------------------------------------ */

export interface RecentDeal {
  id: string;
  title: string;
  contact_name: string | null;
  owner_name: string | null;
  value_cents: number;
  stage: string;
  updated_at: string;
}

export async function getRecentDeals(orgId: string): Promise<RecentDeal[]> {
  return query<RecentDeal>(
    `SELECT d.id, d.title, c.name AS contact_name, u.name AS owner_name,
            d.value_cents, d.stage, d.updated_at
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users u ON u.id = d.owner_id
     WHERE d.org_id=$1
     ORDER BY d.updated_at DESC LIMIT 5`,
    [orgId]
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Leads (5 most recent)                                       */
/* ------------------------------------------------------------------ */

export interface RecentLead {
  id: string;
  name: string;
  company: string | null;
  status: string;
  created_at: string;
}

export async function getRecentLeads(orgId: string): Promise<RecentLead[]> {
  return query<RecentLead>(
    `SELECT id, name, company, status, created_at
     FROM leads WHERE org_id=$1
     ORDER BY created_at DESC LIMIT 5`,
    [orgId]
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue & Pipeline Trend (8 weeks)                                 */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  label: string;   // e.g. "Wk 18"
  revenue: number; // won dollars (not cents)
  pipeline: number; // open pipeline dollars
}

export async function getRevenueTrend(orgId: string): Promise<TrendPoint[]> {
  const rows = await query<{ week_start: string; won: string; pipeline: string }>(
    `WITH weeks AS (
       SELECT generate_series(
         date_trunc('week', now()) - interval '7 weeks',
         date_trunc('week', now()),
         '1 week'
       )::date AS w
     )
     SELECT
       w.w AS week_start,
       COALESCE(SUM(CASE WHEN d.stage='won'
         AND d.updated_at >= w.w
         AND d.updated_at < w.w + interval '7 days'
         THEN d.value_cents ELSE 0 END), 0) AS won,
       COALESCE(SUM(CASE WHEN d.stage NOT IN ('won','lost')
         AND d.created_at < w.w + interval '7 days'
         AND (d.updated_at >= w.w OR d.created_at < w.w + interval '7 days')
         THEN d.value_cents ELSE 0 END), 0) AS pipeline
     FROM weeks w
     LEFT JOIN deals d ON d.org_id=$1
     GROUP BY w.w ORDER BY w.w`,
    [orgId]
  );

  return rows.map((r, i) => ({
    label: `Wk ${i + 1}`,
    revenue: Math.round(Number(r.won) / 100),
    pipeline: Math.round(Number(r.pipeline) / 100),
  }));
}

/* ------------------------------------------------------------------ */
/*  Pipeline Stages (for chart)                                        */
/* ------------------------------------------------------------------ */

export interface PipelineStageItem {
  stage: string;
  count: number;
  color: string;
}

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-chart-1",
  qualified: "bg-chart-2",
  proposal: "bg-chart-3",
  negotiation: "bg-chart-4",
  won: "bg-success",
  lost: "bg-destructive",
};

export async function getPipelineStages(orgId: string): Promise<{
  items: PipelineStageItem[];
  totalValueCents: number;
}> {
  const stages = await getStageBreakdown(orgId);
  const tv = await one<{ v: string }>(
    `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
     WHERE org_id=$1 AND stage NOT IN ('won','lost')`,
    [orgId]
  );
  const items: PipelineStageItem[] = [
    { stage: "lead", count: stages.lead, color: STAGE_COLORS.lead },
    { stage: "qualified", count: stages.qualified, color: STAGE_COLORS.qualified },
    { stage: "proposal", count: stages.proposal, color: STAGE_COLORS.proposal },
    { stage: "negotiation", count: stages.negotiation, color: STAGE_COLORS.negotiation },
    { stage: "won", count: stages.won, color: STAGE_COLORS.won },
    { stage: "lost", count: stages.lost, color: STAGE_COLORS.lost },
  ];
  return { items, totalValueCents: Number((tv as any)?.v ?? 0) };
}

/* ------------------------------------------------------------------ */
/*  Activity Heatmap (last 30 days, grouped by date)                    */
/* ------------------------------------------------------------------ */

export interface HeatmapDay {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

export async function getActivityHeatmap(orgId: string): Promise<HeatmapDay[]> {
  return query<HeatmapDay>(
    `SELECT occurred_at::date AS date, COUNT(*)::int AS count
     FROM activities WHERE org_id=$1
       AND occurred_at >= now() - interval '30 days'
     GROUP BY occurred_at::date
     ORDER BY occurred_at::date`,
    [orgId]
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Status (env-var based)                                  */
/* ------------------------------------------------------------------ */

export interface IntegrationStatus {
  name: string;
  icon: string;   // emoji or icon label
  connected: boolean;
  detail: string; // "Connected" / "Last sync: X min ago" / "Not connected"
  href: string | null;
}

export function getIntegrationStatus(): IntegrationStatus[] {
  const now = Date.now();
  return [
    {
      name: "DeepSeek",
      icon: "\u{1F9E0}",
      connected: !!process.env.DEEPSEEK_API_KEY,
      detail: process.env.DEEPSEEK_API_KEY ? "Connected" : "Not connected",
      href: process.env.DEEPSEEK_API_KEY ? null : "/admin/integrations",
    },
    {
      name: "SendGrid",
      icon: "\u{2709}\u{FE0F}",
      connected: !!process.env.SENDGRID_API_KEY,
      detail: process.env.SENDGRID_API_KEY ? "Connected" : "Not connected",
      href: process.env.SENDGRID_API_KEY ? null : "/admin/integrations",
    },
    {
      name: "Telnyx",
      icon: "\u{1F4DE}",
      connected: !!process.env.TELNYX_API_KEY,
      detail: process.env.TELNYX_API_KEY ? "Connected" : "Not connected",
      href: process.env.TELNYX_API_KEY ? null : "/admin/integrations",
    },
    {
      name: "Google Drive",
      icon: "\u{1F4C1}",
      connected: !!process.env.GOOGLE_DRIVE_TOKEN,
      detail: process.env.GOOGLE_DRIVE_TOKEN ? "Connected" : "Not connected",
      href: process.env.GOOGLE_DRIVE_TOKEN ? null : "/admin/integrations",
    },
    {
      name: "Postgres",
      icon: "\u{1F5C4}\u{FE0F}",
      connected: true,
      detail: "Healthy",
      href: null,
    },
    {
      name: "ZITADEL",
      icon: "\u{1F512}",
      connected: true,
      detail: "Connected",
      href: null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Delta helpers (optional — compare vs last period)                  */
/* ------------------------------------------------------------------ */

export interface KPIDelta {
  value: string;
  dir: "up" | "down";
}

export async function getDashboardDeltas(orgId: string): Promise<{
  pipelineDelta: KPIDelta | null;
  wonDelta: KPIDelta | null;
  burnDelta: KPIDelta | null;
  leadsDelta: KPIDelta | null;
}> {
  // Won last month for comparison
  const [wonThisMonth, wonLastMonth] = await Promise.all([
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage='won'
         AND updated_at >= date_trunc('month', now())`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage='won'
         AND updated_at >= date_trunc('month', now()) - interval '1 month'
         AND updated_at < date_trunc('month', now())`,
      [orgId]
    ),
  ]);

  const wM = Number((wonThisMonth as any)?.v ?? 0);
  const wL = Number((wonLastMonth as any)?.v ?? 0);

  const wonDelta: KPIDelta | null = wL > 0
    ? { value: `${Math.round(Math.abs((wM - wL) / wL) * 100)}%`, dir: wM >= wL ? "up" : "down" }
    : null;

  // Pipeline vs last month
  const [pipelineNow, pipelineLast] = await Promise.all([
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage NOT IN ('won','lost')`,
      [orgId]
    ),
    // approximation: deals created before this month
    one<{ v: string }>(
      `SELECT COALESCE(SUM(value_cents),0) AS v FROM deals
       WHERE org_id=$1 AND stage NOT IN ('won','lost')
         AND created_at < date_trunc('month', now())`,
      [orgId]
    ),
  ]);

  const pN = Number((pipelineNow as any)?.v ?? 0);
  const pL = Number((pipelineLast as any)?.v ?? 0);
  const pipelineDelta: KPIDelta | null = pL > 0
    ? { value: `${Math.round(Math.abs((pN - pL) / pL) * 100)}%`, dir: pN >= pL ? "up" : "down" }
    : null;

  // Leads this week vs last week
  const [leadsThisWeek, leadsLastWeek] = await Promise.all([
    one<{ v: string }>(
      `SELECT COUNT(*) AS v FROM leads WHERE org_id=$1
         AND created_at > now() - interval '7 days'`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COUNT(*) AS v FROM leads WHERE org_id=$1
         AND created_at > now() - interval '14 days'
         AND created_at <= now() - interval '7 days'`,
      [orgId]
    ),
  ]);

  const lTW = Number((leadsThisWeek as any)?.v ?? 0);
  const lLW = Number((leadsLastWeek as any)?.v ?? 0);
  const leadsDelta: KPIDelta | null = lLW > 0
    ? { value: `${Math.round(Math.abs((lTW - lLW) / lLW) * 100)}%`, dir: lTW >= lLW ? "up" : "down" }
    : null;

  // Burn delta — compare active subs now vs last month
  const [burnNow, burnLast] = await Promise.all([
    one<{ v: string }>(
      `SELECT COALESCE(SUM(amount_cents),0) AS v FROM subscriptions
       WHERE org_id=$1 AND active=true`,
      [orgId]
    ),
    one<{ v: string }>(
      `SELECT COALESCE(SUM(amount_cents),0) AS v FROM subscriptions
       WHERE org_id=$1 AND active=true
         AND created_at < date_trunc('month', now())`,
      [orgId]
    ),
  ]);

  const bN = Number((burnNow as any)?.v ?? 0);
  const bL = Number((burnLast as any)?.v ?? 0);
  const burnDelta: KPIDelta | null = bL > 0
    ? { value: `${Math.round(Math.abs((bN - bL) / bL) * 100)}%`, dir: bN <= bL ? "up" : "down" }
    : null;

  return { pipelineDelta, wonDelta, burnDelta, leadsDelta };
}

/* ------------------------------------------------------------------ */
/*  AEON business recap (AI or computed fallback)                       */
/* ------------------------------------------------------------------ */

export interface DashboardInsight {
  insight: string;
  source: "ai" | "computed";
}

function computedInsight(
  pipelineVal: number,
  wonVal: number,
  burnVal: number,
  leadsVal: number,
): string {
  const runway = burnVal > 0 ? Math.round(wonVal / burnVal) : 0;
  const pipelineStr = (pipelineVal / 100).toLocaleString("en-US");
  const wonStr = (wonVal / 100).toLocaleString("en-US");
  const burnStr = (burnVal / 100).toLocaleString("en-US");
  return `Pipeline stands at $${pipelineStr} across active deals. Won $${wonStr} this month with ${leadsVal} new leads this week. Monthly burn is $${burnStr}/mo${runway > 0 ? ` — projected runway ${runway} months` : ""}.`;
}

export async function getDashboardInsight(orgId: string): Promise<DashboardInsight> {
  const [kpis, stages] = await Promise.all([getDashboardKPIs(orgId), getStageBreakdown(orgId)]);
  const { pipelineValueCents: pipelineVal, wonThisMonthCents: wonVal, monthlyBurnCents: burnVal, newLeadsCount: leadsVal, openTasksCount: tasksVal } = kpis;

  if (!process.env.DEEPSEEK_API_KEY) {
    return { insight: computedInsight(pipelineVal, wonVal, burnVal, leadsVal), source: "computed" };
  }

  try {
    const pipelineStr = (pipelineVal / 100).toLocaleString("en-US");
    const wonStr = (wonVal / 100).toLocaleString("en-US");
    const burnStr = (burnVal / 100).toLocaleString("en-US");
    const { text } = await generateText({
      model: aeonModel(),
      system:
        "You are AEON, a business intelligence AI. Generate a 2-3 sentence natural language business recap. Be direct, use exact numbers, and include a forward-looking observation. No bullet points. No headers. Pure prose.",
      prompt: `Pipeline: $${pipelineStr}. Won this month: $${wonStr}. Monthly burn: $${burnStr}. New leads this week: ${leadsVal}. Open tasks: ${tasksVal}. Stage breakdown: ${JSON.stringify(stages)}.`,
    });
    return { insight: text, source: "ai" };
  } catch {
    return { insight: computedInsight(pipelineVal, wonVal, burnVal, leadsVal), source: "computed" };
  }
}
