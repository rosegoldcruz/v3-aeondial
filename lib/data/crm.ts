import { generateText } from "ai";
import { aeonModel } from "@/lib/ai/client";
import { one, query } from "@/lib/db/pool";
import type { Activity, Contact, Deal, DealStage } from "@/types/models";

export interface ContactRow extends Contact {
  owner_name: string | null;
}

export interface ContactActivityRow extends Activity {
  user_name: string | null;
}

export interface ContactDetail extends ContactRow {
  activities: ContactActivityRow[];
  ai_summary: string;
  computed_summary: string;
}

export interface DealRow extends Deal {
  contact_name: string | null;
  contact_company: string | null;
  contact_email: string | null;
  owner_name: string | null;
  days_in_stage: number;
}

export interface DealActivityRow extends Activity {
  user_name: string | null;
}

export interface DealDetail extends DealRow {
  activities: DealActivityRow[];
  ai_insight: string;
  computed_insight: string;
  contact_email: string | null;
}

export async function listContacts(orgId: string): Promise<ContactRow[]> {
  return query<ContactRow>(
    `SELECT c.*, u.name AS owner_name
     FROM contacts c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.org_id=$1
     ORDER BY c.updated_at DESC, c.created_at DESC`,
    [orgId]
  );
}

export async function listDeals(orgId: string): Promise<DealRow[]> {
  const rows = await query<DealRow>(
    `SELECT d.*, c.name AS contact_name, c.company AS contact_company, c.email AS contact_email, u.name AS owner_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users u ON u.id = d.owner_id
     WHERE d.org_id=$1
     ORDER BY d.last_stage_change DESC, d.updated_at DESC`,
    [orgId]
  );
  return rows.map((row) => ({ ...row, days_in_stage: daysSince(row.last_stage_change) }));
}

export async function pipelineValueCents(orgId: string): Promise<number> {
  const r = await one<{ sum: string }>(
    "SELECT COALESCE(SUM(value_cents),0) AS sum FROM deals WHERE org_id=$1 AND stage NOT IN ('won','lost')",
    [orgId]
  );
  return Number(r?.sum ?? 0);
}

export async function getContactDetail(orgId: string, contactId: string): Promise<ContactDetail | null> {
  const contact = await one<ContactRow>(
    `SELECT c.*, u.name AS owner_name
     FROM contacts c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.org_id=$1 AND c.id=$2
     LIMIT 1`,
    [orgId, contactId]
  );
  if (!contact) return null;

  const activities = await contactActivities(orgId, contactId);
  return {
    ...contact,
    activities,
    computed_summary: computedContactSummary(contact, activities),
    ai_summary: await aiContactSummary(contact, activities),
  };
}

export async function getDealDetail(orgId: string, dealId: string): Promise<DealDetail | null> {
  const deal = await one<DealRow>(
    `SELECT d.*, c.name AS contact_name, c.company AS contact_company, c.email AS contact_email, u.name AS owner_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users u ON u.id = d.owner_id
     WHERE d.org_id=$1 AND d.id=$2
     LIMIT 1`,
    [orgId, dealId]
  );
  if (!deal) return null;

  const activities = await dealActivities(orgId, dealId);
  return {
    ...deal,
    days_in_stage: daysSince(deal.last_stage_change),
    activities,
    computed_insight: computedDealInsight(deal, activities),
    ai_insight: await aiDealInsight(deal, activities),
  };
}

export async function createContact(input: {
  org_id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedin?: string;
  twitter?: string;
  birthday?: string | null;
  referral_source?: string;
  first_contact_date?: string | null;
  lifetime_value_cents?: number;
  notes?: string;
  interests?: string;
  tags?: string[];
  owner_id?: string | null;
}): Promise<ContactRow> {
  const row = await one<{ id: string }>(
    `INSERT INTO contacts (
       org_id, name, title, company, email, phone, linkedin, twitter,
       birthday, referral_source, first_contact_date, lifetime_value_cents,
       health_score, health_tier, notes, interests, tags, owner_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,100,'healthy',$13,$14,$15,$16)
     RETURNING id`,
    [
      input.org_id,
      input.name,
      input.title ?? null,
      input.company ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.linkedin ?? null,
      input.twitter ?? null,
      input.birthday ?? null,
      input.referral_source ?? null,
      input.first_contact_date ?? null,
      input.lifetime_value_cents ?? 0,
      input.notes ?? null,
      input.interests ?? null,
      input.tags ?? [],
      input.owner_id ?? null,
    ]
  );
  return (await getContactDetail(input.org_id, row!.id))!;
}

export async function updateContact(orgId: string, contactId: string, patch: ContactPatch): Promise<ContactRow | null> {
  const row = await one<ContactRow>(
    `UPDATE contacts SET
       name = COALESCE($3, name),
       title = COALESCE($4, title),
       company = COALESCE($5, company),
       email = COALESCE($6, email),
       phone = COALESCE($7, phone),
       linkedin = COALESCE($8, linkedin),
       twitter = COALESCE($9, twitter),
       birthday = COALESCE($10, birthday),
       referral_source = COALESCE($11, referral_source),
       first_contact_date = COALESCE($12, first_contact_date),
       lifetime_value_cents = COALESCE($13, lifetime_value_cents),
       notes = COALESCE($14, notes),
       interests = COALESCE($15, interests),
       tags = COALESCE($16, tags),
       owner_id = CASE WHEN $17 IS NULL THEN owner_id ELSE $17 END,
       updated_at = now()
     WHERE org_id=$1 AND id=$2
     RETURNING id`,
    [
      orgId,
      contactId,
      patch.name ?? null,
      patch.title ?? null,
      patch.company ?? null,
      patch.email ?? null,
      patch.phone ?? null,
      patch.linkedin ?? null,
      patch.twitter ?? null,
      patch.birthday ?? null,
      patch.referral_source ?? null,
      patch.first_contact_date ?? null,
      patch.lifetime_value_cents ?? null,
      patch.notes ?? null,
      patch.interests ?? null,
      patch.tags ?? null,
      patch.owner_id ?? null,
    ]
  );
  if (!row) return null;
  return getContact(orgId, contactId);
}

export async function deleteContact(orgId: string, contactId: string): Promise<boolean> {
  const row = await one<{ id: string }>(
    "DELETE FROM contacts WHERE org_id=$1 AND id=$2 RETURNING id",
    [orgId, contactId]
  );
  return Boolean(row);
}

export async function logContactActivity(orgId: string, contactId: string, input: ActivityInput): Promise<ContactActivityRow | null> {
  const activity = await one<ContactActivityRow>(
    `INSERT INTO activities (org_id, contact_id, kind, subject, body, sentiment, duration_seconds, user_id, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, now()))
     RETURNING *`,
    [
      orgId,
      contactId,
      input.kind,
      input.subject ?? null,
      input.body ?? null,
      input.sentiment ?? "neutral",
      input.duration_seconds ?? null,
      input.user_id ?? null,
      input.occurred_at ?? null,
    ]
  );
  if (!activity) return null;
  await recomputeContactHealth(orgId, contactId);
  return (await contactActivities(orgId, contactId)).find((item) => item.id === activity.id) ?? activity;
}

export async function recomputeContactHealth(orgId: string, contactId: string) {
  const activities = await query<ContactActivityRow>(
    `SELECT * FROM activities WHERE org_id=$1 AND contact_id=$2 ORDER BY occurred_at DESC`,
    [orgId, contactId]
  );
  const lastActivity = activities[0];
  const daysSince = lastActivity ? daysBetween(lastActivity.occurred_at) : 999;

  let score = 100;
  if (daysSince > 30) score -= 40;
  else if (daysSince > 14) score -= 25;
  else if (daysSince > 7) score -= 10;

  score += Math.min(activities.length * 3, 20);
  const recentNeg = activities.slice(0, 5).filter((activity) => activity.sentiment === "negative").length;
  score -= recentNeg * 8;
  score = Math.max(0, Math.min(100, score));

  const tier = contactHealthTier(daysSince);
  await query(
    `UPDATE contacts SET last_activity_at=$3, health_score=$4, health_tier=$5, updated_at=now()
     WHERE org_id=$1 AND id=$2`,
    [orgId, contactId, lastActivity?.occurred_at ?? null, score, tier]
  );
  return { score, tier, last_activity_at: lastActivity?.occurred_at ?? null };
}

export async function createDeal(input: {
  org_id: string;
  title: string;
  contact_id?: string | null;
  value_cents: number;
  stage?: DealStage;
  probability?: number;
  expected_close?: string | null;
  next_action?: string | null;
  competitor?: string | null;
  notes?: string | null;
  owner_id?: string | null;
}): Promise<DealRow> {
  const row = await one<{ id: string }>(
    `INSERT INTO deals (
       org_id, title, contact_id, value_cents, stage, probability, expected_close,
       next_action, competitor, notes, owner_id, last_stage_change
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()) RETURNING id`,
    [
      input.org_id,
      input.title,
      input.contact_id ?? null,
      input.value_cents,
      input.stage ?? "lead",
      input.probability ?? 20,
      input.expected_close ?? null,
      input.next_action ?? null,
      input.competitor ?? null,
      input.notes ?? null,
      input.owner_id ?? null,
    ]
  );
  return (await getDeal(input.org_id, row!.id))!;
}

export async function updateDeal(orgId: string, dealId: string, patch: DealPatch): Promise<DealRow | null> {
  const previous = await one<{ stage: DealStage }>("SELECT stage FROM deals WHERE org_id=$1 AND id=$2", [orgId, dealId]);
  const row = await one<{ id: string }>(
    `UPDATE deals SET
       title = COALESCE($3, title),
       contact_id = COALESCE($4, contact_id),
       stage = COALESCE($5, stage),
       value_cents = COALESCE($6, value_cents),
       probability = COALESCE($7, probability),
       expected_close = COALESCE($8, expected_close),
       next_action = COALESCE($9, next_action),
       competitor = COALESCE($10, competitor),
       notes = COALESCE($11, notes),
       owner_id = COALESCE($12, owner_id),
       last_stage_change = CASE WHEN $5 IS NOT NULL AND $5 <> stage THEN now() ELSE last_stage_change END,
       updated_at = now()
     WHERE org_id=$1 AND id=$2
     RETURNING id`,
    [
      orgId,
      dealId,
      patch.title ?? null,
      patch.contact_id ?? null,
      patch.stage ?? null,
      patch.value_cents ?? null,
      patch.probability ?? null,
      patch.expected_close ?? null,
      patch.next_action ?? null,
      patch.competitor ?? null,
      patch.notes ?? null,
      patch.owner_id ?? null,
    ]
  );
  if (!row) return null;
  if (patch.stage && previous?.stage !== patch.stage) {
    await query(
      `INSERT INTO activities (org_id, deal_id, kind, subject, body, sentiment, occurred_at)
       VALUES ($1,$2,'note',$3,$4,'neutral', now())`,
      [orgId, dealId, `Moved to ${patch.stage}`, previous?.stage ? `Moved from ${previous.stage} to ${patch.stage}` : `Moved to ${patch.stage}`]
    );
  }
  return getDeal(orgId, dealId);
}

export async function moveDeal(orgId: string, dealId: string, stage: DealStage): Promise<DealRow | null> {
  return updateDeal(orgId, dealId, { stage });
}

export async function deleteDeal(orgId: string, dealId: string): Promise<boolean> {
  const row = await one<{ id: string }>(
    "DELETE FROM deals WHERE org_id=$1 AND id=$2 RETURNING id",
    [orgId, dealId]
  );
  return Boolean(row);
}

export async function logDealActivity(orgId: string, dealId: string, input: ActivityInput): Promise<DealActivityRow | null> {
  const activity = await one<DealActivityRow>(
    `INSERT INTO activities (org_id, deal_id, kind, subject, body, sentiment, duration_seconds, user_id, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, now()))
     RETURNING *`,
    [
      orgId,
      dealId,
      input.kind,
      input.subject ?? null,
      input.body ?? null,
      input.sentiment ?? "neutral",
      input.duration_seconds ?? null,
      input.user_id ?? null,
      input.occurred_at ?? null,
    ]
  );
  if (!activity) return null;
  return (await dealActivities(orgId, dealId)).find((item) => item.id === activity.id) ?? activity;
}

export async function dealsByStage(orgId: string): Promise<Record<DealStage, DealRow[]>> {
  const deals = await listDeals(orgId);
  const grouped: Record<DealStage, DealRow[]> = { lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [] };
  for (const deal of deals) grouped[deal.stage].push(deal);
  return grouped;
}

export async function pipelineForecast(orgId: string) {
  const deals = await listDeals(orgId);
  const active = deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const won = deals.filter((deal) => deal.stage === "won");
  const openPipeline = active.reduce((sum, deal) => sum + deal.value_cents, 0);
  const wonThisMonth = won.filter((deal) => isThisMonth(deal.updated_at)).reduce((sum, deal) => sum + deal.value_cents, 0);
  const closeRate = active.length ? Math.round((won.length / Math.max(1, deals.length)) * 100) : 0;
  const projected = wonThisMonth + Math.round(openPipeline * (closeRate / 100));
  const monthlyTarget = 25000000;
  const gap = Math.max(0, monthlyTarget - projected);
  const avgQualified = Math.max(1, Math.round(active.filter((deal) => deal.stage === "qualified").reduce((sum, deal) => sum + deal.value_cents, 0) / Math.max(1, active.filter((deal) => deal.stage === "qualified").length)));
  const neededQualified = Math.max(0, Math.ceil(gap / avgQualified));
  return { monthlyTarget, projected, gap, closeRate, neededQualified, openPipeline, wonThisMonth };
}

export async function pipelineInsight(orgId: string) {
  const deals = await listDeals(orgId);
  const active = deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const stuck = active
    .filter((deal) => deal.days_in_stage > 7)
    .sort((a, b) => b.days_in_stage - a.days_in_stage)[0];
  const proposal = active.filter((deal) => deal.stage === "proposal");
  const proposalWinRate = proposal.length ? Math.round((deals.filter((deal) => deal.stage === "won").length / Math.max(1, proposal.length)) * 100) : 0;
  const computed = `Pipeline is ${money(active.reduce((sum, deal) => sum + deal.value_cents, 0))} across ${active.length} active deals${stuck ? ` with 1 stuck in ${stuck.stage} for ${stuck.days_in_stage} days` : ""}. Proposal stage has a ${proposalWinRate}% win rate. ${stuck ? `Recommend nudging ${stuck.title} before ${stuck.expected_close ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(stuck.expected_close)) : "the next close date"}.` : ""}`;
  try {
    const { text } = await generateText({
      model: aeonModel(),
      prompt: `Write one concise CRM pipeline health insight. Use these facts: active pipeline ${money(active.reduce((sum, deal) => sum + deal.value_cents, 0))}; active deals ${active.length}; stuck deal ${stuck ? `${stuck.title} in ${stuck.stage} for ${stuck.days_in_stage} days` : "none"}; proposal win rate ${proposalWinRate}%; monthly target $250,000; projected ${money((await pipelineForecast(orgId)).projected)}. Mention a single recommended action.`,
    });
    return { insight: text.trim() || computed, source: "ai" as const, computed };
  } catch {
    return { insight: computed, source: "computed" as const, computed };
  }
}

export async function updateContactHealthFromActivity(orgId: string, contactId: string) {
  return recomputeContactHealth(orgId, contactId);
}

async function getContact(orgId: string, contactId: string) {
  return one<ContactRow>(
    `SELECT c.*, u.name AS owner_name
     FROM contacts c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.org_id=$1 AND c.id=$2
     LIMIT 1`,
    [orgId, contactId]
  );
}

async function getDeal(orgId: string, dealId: string) {
  const deal = await one<DealRow>(
    `SELECT d.*, c.name AS contact_name, c.company AS contact_company, c.email AS contact_email, u.name AS owner_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users u ON u.id = d.owner_id
     WHERE d.org_id=$1 AND d.id=$2
     LIMIT 1`,
    [orgId, dealId]
  );
  return deal ? { ...deal, days_in_stage: daysSince(deal.last_stage_change) } : null;
}

async function contactActivities(orgId: string, contactId: string) {
  return query<ContactActivityRow>(
    `SELECT a.*, u.name AS user_name
     FROM activities a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.org_id=$1 AND a.contact_id=$2
     ORDER BY a.occurred_at DESC`,
    [orgId, contactId]
  );
}

async function dealActivities(orgId: string, dealId: string) {
  return query<DealActivityRow>(
    `SELECT a.*, u.name AS user_name
     FROM activities a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.org_id=$1 AND a.deal_id=$2
     ORDER BY a.occurred_at DESC`,
    [orgId, dealId]
  );
}

function daysSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

function daysBetween(value: string) {
  return daysSince(value);
}

function contactHealthTier(daysSinceActivity: number) {
  if (daysSinceActivity > 30) return "cold";
  if (daysSinceActivity > 7) return "at_risk";
  return "healthy";
}

function computedContactSummary(contact: ContactRow, activities: ContactActivityRow[]) {
  if (!activities.length) return "No interactions logged yet.";
  const last = activities[0];
  const days = daysSince(last.occurred_at);
  const touchpoints30 = activities.filter((activity) => daysBetween(activity.occurred_at) <= 30).length;
  const recentNegative = activities.slice(0, 5).filter((activity) => activity.sentiment === "negative").length;
  const lastVerb = last.kind === "call" ? "Spoke" : last.kind === "email" ? "Emailed" : last.kind === "meeting" ? "Met" : "Touched base";
  return `${lastVerb} ${days} days ago. ${touchpoints30} touchpoints in the last 30 days.${recentNegative ? ` ${recentNegative} recent negative interaction${recentNegative === 1 ? "" : "s"}.` : ""} ${contact.health_tier === "cold" ? "Recommend a different channel." : ""}`.trim();
}

async function aiContactSummary(contact: ContactRow, activities: ContactActivityRow[]) {
  const recent = activities.slice(0, 6).map((activity) => `${activity.kind}: ${activity.subject ?? "No subject"} (${activity.sentiment})`).join("\n");
  try {
    const { text } = await generateText({
      model: aeonModel(),
      prompt: `Write one concise CRM relationship summary for ${contact.name}${contact.company ? ` at ${contact.company}` : ""}. Use this recent activity history:\n${recent || "No activity."}\nMention the timing of the last touch, the overall relationship temperature, and one next action recommendation.`,
    });
    return text.trim() || computedContactSummary(contact, activities);
  } catch {
    return computedContactSummary(contact, activities);
  }
}

function computedDealInsight(deal: DealRow, activities: DealActivityRow[]) {
  if (!activities.length) {
    return deal.days_in_stage > 7
      ? `This deal has been in ${deal.stage} for ${deal.days_in_stage} days. Consider a follow-up.`
      : `This deal is in ${deal.stage} and ready for the next touch.`;
  }
  const last = activities[0];
  const lastDays = daysSince(last.occurred_at);
  return `This deal has been in ${deal.stage} for ${deal.days_in_stage} days. Last activity was ${lastDays} days ago. ${deal.days_in_stage > 14 ? "Consider a discount or escalation." : "Keep the momentum moving."}`;
}

async function aiDealInsight(deal: DealRow, activities: DealActivityRow[]) {
  const recent = activities.slice(0, 5).map((activity) => `${activity.kind}: ${activity.subject ?? "No subject"}`).join("\n");
  try {
    const { text } = await generateText({
      model: aeonModel(),
      prompt: `Write one concise CRM deal insight for ${deal.title}. Facts: stage ${deal.stage}; value ${money(deal.value_cents)}; probability ${deal.probability}%; days in stage ${deal.days_in_stage}; contact ${deal.contact_name ?? "unassigned"}; next action ${deal.next_action ?? "none"}. Recent activity:\n${recent || "No activity."}`,
    });
    return text.trim() || computedDealInsight(deal, activities);
  } catch {
    return computedDealInsight(deal, activities);
  }
}

function isThisMonth(value: string) {
  const current = new Date();
  const date = new Date(value);
  return date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
}

function money(value: number) {
  return `$${(value / 100).toLocaleString("en-US")}`;
}

export interface ContactPatch {
  name?: string | null;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  birthday?: string | null;
  referral_source?: string | null;
  first_contact_date?: string | null;
  lifetime_value_cents?: number | null;
  notes?: string | null;
  interests?: string | null;
  tags?: string[] | null;
  owner_id?: string | null;
}

export interface DealPatch {
  title?: string | null;
  contact_id?: string | null;
  stage?: DealStage | null;
  value_cents?: number | null;
  probability?: number | null;
  expected_close?: string | null;
  next_action?: string | null;
  competitor?: string | null;
  notes?: string | null;
  owner_id?: string | null;
}

export interface ActivityInput {
  kind: "call" | "email" | "note" | "meeting" | "task";
  subject?: string | null;
  body?: string | null;
  sentiment?: string | null;
  duration_seconds?: number | null;
  user_id?: string | null;
  occurred_at?: string | null;
}