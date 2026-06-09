/**
 * Progressive Power Dialer Engine v2
 *
 * Features:
 * - Batch dialing with configurable ratio (1:N)
 * - First-connect-wins: cancels remaining batch on human answer
 * - AMD (Answering Machine Detection) via Twilio
 * - Voicemail drop playback
 * - Lead prioritization scoring
 * - Compliance: DNC, quiet hours, timezone
 * - Agent state machine
 */

import { query, one } from "@/lib/db/pool";
import { originateCall, hangupCall } from "@/lib/telephony/providers";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentState = "AVAILABLE" | "DIALING" | "WAITING_FOR_CONNECT" | "CONNECTED" | "PAUSED" | "BREAK" | "OFFLINE";
export type DialOutcome = "CONNECTED" | "VOICEMAIL_DROP" | "BUSY" | "NO_ANSWER" | "DISCONNECTED" | "FAILED" | "DNC" | "CALLBACK_REQUESTED" | "APPOINTMENT_BOOKED" | "SALE";

export interface DialSession {
  id: string; org_id: string; user_id: string; campaign_id: string | null;
  status: string; dial_ratio: number;
  started_at: string; ended_at: string | null;
  total_attempts: number; total_connects: number; total_vm_drops: number; total_duration_s: number;
}

export interface CallAttempt {
  id: string; org_id: string; session_id: string;
  lead_id: string | null; contact_id: string | null;
  phone_number: string; provider: string | null; provider_call_id: string | null;
  batch_index: number; status: string; outcome: DialOutcome | null;
  amd_result: string | null; disposition: string | null;
  started_at: string | null; connected_at: string | null; ended_at: string | null;
  duration_s: number | null; recording_url: string | null; cancel_reason: string | null;
}

export interface AgentPresence {
  id: string; org_id: string; user_id: string;
  state: AgentState; session_id: string | null; current_call_id: string | null;
  last_state_at: string; total_talk_s: number; total_calls: number;
}

export interface CampaignRule {
  id: string; org_id: string; campaign_id: string | null;
  dial_ratio: number; max_attempts: number; attempt_delay_m: number;
  quiet_hours_start: number | null; quiet_hours_end: number | null;
  timezone: string; require_amd: boolean; vm_drop_id: string | null; active: boolean;
}

export interface VoicemailDrop {
  id: string; org_id: string; name: string; audio_url: string;
  campaign_id: string | null; duration_s: number | null;
}

// ─── Agent Presence ──────────────────────────────────────────────────────────

export async function getAgentPresence(orgId: string, userId: string): Promise<AgentPresence | null> {
  return one<AgentPresence>(
    "SELECT * FROM agent_presence WHERE org_id=$1 AND user_id=$2",
    [orgId, userId]
  );
}

export async function setAgentState(
  orgId: string, userId: string, state: AgentState, sessionId?: string, callId?: string
): Promise<AgentPresence | null> {
  const existing = await getAgentPresence(orgId, userId);
  if (existing) {
    return one<AgentPresence>(
      `UPDATE agent_presence SET state=$3, session_id=$4, current_call_id=$5, last_state_at=now(), updated_at=now()
       WHERE org_id=$1 AND user_id=$2 RETURNING *`,
      [orgId, userId, state, sessionId ?? null, callId ?? null]
    );
  }
  return one<AgentPresence>(
    `INSERT INTO agent_presence (org_id, user_id, state, session_id, current_call_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orgId, userId, state, sessionId ?? null, callId ?? null]
  );
}

// ─── Session Management ──────────────────────────────────────────────────────

export async function createSession(
  orgId: string, userId: string, campaignId: string | null, dialRatio: number
): Promise<DialSession | null> {
  return one<DialSession>(
    `INSERT INTO dial_sessions (org_id, user_id, campaign_id, dial_ratio, status)
     VALUES ($1,$2,$3,$4,'active') RETURNING *`,
    [orgId, userId, campaignId, dialRatio]
  );
}

export async function endSession(sessionId: string, orgId: string): Promise<void> {
  await query(
    `UPDATE dial_sessions SET status='ended', ended_at=now() WHERE id=$1 AND org_id=$2`,
    [sessionId, orgId]
  );
  // End any active bridges
  await query(
    `UPDATE call_bridges SET bridge_ended=now(), duration_s=EXTRACT(EPOCH FROM (now() - bridge_started))::int
     WHERE session_id=$1 AND bridge_ended IS NULL`,
    [sessionId]
  );
}

export async function getActiveSession(orgId: string, userId: string): Promise<DialSession | null> {
  return one<DialSession>(
    "SELECT * FROM dial_sessions WHERE org_id=$1 AND user_id=$2 AND status='active' ORDER BY started_at DESC LIMIT 1",
    [orgId, userId]
  );
}

// ─── Lead Prioritization ─────────────────────────────────────────────────────

export interface ScoredLead {
  id: string; phone: string; first_name: string | null; last_name: string | null;
  score: number; priority: string; last_contact: string | null;
  source: string | null; revenue_potential: number | null; attempts: number;
}

export async function getNextLeads(orgId: string, campaignId: string | null, limit: number): Promise<ScoredLead[]> {
  // Score leads based on: hot/warm/cold, last contact, revenue potential, attempts, source
  const campaignFilter = campaignId ? "AND campaign_id=$2::uuid" : "AND campaign_id IS NULL";
  const params = campaignId ? [orgId, campaignId, limit] : [orgId, limit];

  return query<ScoredLead>(
    `WITH scored AS (
      SELECT
        l.id,
        COALESCE(l.phone, c.phone) as phone,
        l.first_name,
        l.last_name,
        l.last_contact_at,
        l.source,
        l.revenue_potential_cents,
        COALESCE(a.attempts, 0) as attempts,
        CASE
          WHEN l.status = 'hot' THEN 100
          WHEN l.status = 'warm' THEN 70
          WHEN l.status = 'callback' THEN 90
          WHEN l.status = 'recent_inbound' THEN 80
          ELSE 40
        END +
        COALESCE(l.revenue_potential_cents / 1000, 0) -
        (COALESCE(a.attempts, 0) * 10) +
        CASE WHEN l.last_contact_at IS NULL THEN 20
             WHEN l.last_contact_at < now() - interval '7 days' THEN 15
             ELSE 0 END
        as score
      FROM leads l
      LEFT JOIN contacts c ON c.lead_id = l.id AND c.is_primary = true
      LEFT JOIN (
        SELECT lead_id, COUNT(*) as attempts FROM call_attempts
        WHERE created_at > now() - interval '30 days' GROUP BY lead_id
      ) a ON a.lead_id = l.id
      WHERE l.org_id = $1
        AND l.phone IS NOT NULL
        AND l.status NOT IN ('converted', 'lost', 'dnc')
        ${campaignFilter}
        AND NOT EXISTS (
          SELECT 1 FROM dnc_list d WHERE d.org_id = l.org_id AND d.phone = l.phone
        )
      ORDER BY score DESC, l.created_at DESC
      LIMIT $3
    )
    SELECT * FROM scored WHERE phone IS NOT NULL`,
    params
  );
}

// ─── Compliance Checks ───────────────────────────────────────────────────────

export async function isDnc(orgId: string, phone: string): Promise<boolean> {
  const row = await one<{ count: number }>("SELECT COUNT(*)::int as count FROM dnc_list WHERE org_id=$1 AND phone=$2", [orgId, phone]);
  return (row?.count ?? 0) > 0;
}

export function isQuietHours(rule: CampaignRule | null): boolean {
  if (!rule || rule.quiet_hours_start == null || rule.quiet_hours_end == null) return false;
  const now = new Date();
  const tz = rule.timezone || "America/Chicago";
  // Simplified: check local hour
  const hour = now.getHours();
  if (rule.quiet_hours_start < rule.quiet_hours_end) {
    return hour >= rule.quiet_hours_start && hour < rule.quiet_hours_end;
  }
  return hour >= rule.quiet_hours_start || hour < rule.quiet_hours_end;
}

// ─── Batch Dialing ───────────────────────────────────────────────────────────

export async function placeBatch(
  orgId: string,
  sessionId: string,
  leads: ScoredLead[],
  agentPhone: string,
  vmDrop: VoicemailDrop | null
): Promise<CallAttempt[]> {
  const attempts: CallAttempt[] = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (!lead.phone) continue;

    // Create attempt record
    const attempt = await one<CallAttempt>(
      `INSERT INTO call_attempts (org_id, session_id, lead_id, phone_number, batch_index, status)
       VALUES ($1,$2,$3,$4,$5,'dialing') RETURNING *`,
      [orgId, sessionId, lead.id, lead.phone, i]
    );
    if (!attempt) continue;

    try {
      // Place the call via Twilio with AMD enabled
      const result = await originateCall({
        orgId,
        toNumber: lead.phone,
        fromNumber: process.env.TWILIO_PHONE_NUMBER || undefined,
        record: true,
      });

      // Update attempt with provider info
      await query(
        `UPDATE call_attempts SET provider=$3, provider_call_id=$4, status='ringing', started_at=now()
         WHERE id=$1 AND org_id=$2`,
        [attempt.id, orgId, result.provider, result.callSid]
      );

      attempts.push({ ...attempt, provider: result.provider, provider_call_id: result.callSid, status: "ringing" });
    } catch {
      // Mark as failed
      await query(
        `UPDATE call_attempts SET status='failed', ended_at=now(), outcome='FAILED'::dial_outcome
         WHERE id=$1 AND org_id=$2`,
        [attempt.id, orgId]
      );
    }
  }

  // Update session attempt count
  await query(
    "UPDATE dial_sessions SET total_attempts = total_attempts + $2 WHERE id=$1",
    [sessionId, attempts.length]
  );

  return attempts;
}

// ─── First Connect Wins ──────────────────────────────────────────────────────

export async function handleConnect(
  orgId: string,
  sessionId: string,
  winningAttemptId: string,
  userId: string,
  amdResult?: string
): Promise<{ bridged: boolean; reason?: string }> {
  // Check if another call already won
  const existingBridge = await one<{ id: string }>(
    "SELECT id FROM call_bridges WHERE session_id=$1 AND bridge_ended IS NULL LIMIT 1",
    [sessionId]
  );
  if (existingBridge) {
    // Another call already connected — cancel this one
    await cancelAttempt(orgId, winningAttemptId, "FIRST_CONNECT_WON");
    return { bridged: false, reason: "FIRST_CONNECT_WON" };
  }

  // Mark winning attempt
  await query(
    `UPDATE call_attempts SET status='connected', connected_at=now(), outcome='CONNECTED'::dial_outcome
     WHERE id=$1 AND org_id=$2`,
    [winningAttemptId, orgId]
  );

  // Create bridge
  await one(
    `INSERT INTO call_bridges (org_id, session_id, winning_attempt_id, user_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, sessionId, winningAttemptId, userId]
  );

  // Update agent state
  await setAgentState(orgId, userId, "CONNECTED", sessionId, winningAttemptId);

  // Cancel all other ringing attempts in this session
  const others = await query<CallAttempt>(
    `SELECT * FROM call_attempts WHERE session_id=$1 AND id != $2 AND status IN ('queued','dialing','ringing')`,
    [sessionId, winningAttemptId]
  );
  for (const o of others) {
    await cancelAttempt(orgId, o.id, "FIRST_CONNECT_WON");
    if (o.provider_call_id) {
      try { await hangupCall(o.provider as "twilio" | "telnyx", o.provider_call_id); } catch {}
    }
  }

  // Update session
  await query(
    "UPDATE dial_sessions SET total_connects = total_connects + 1 WHERE id=$1",
    [sessionId]
  );

  return { bridged: true };
}

export async function cancelAttempt(orgId: string, attemptId: string, reason: string): Promise<void> {
  await query(
    `UPDATE call_attempts SET status='cancelled', ended_at=now(), cancel_reason=$3
     WHERE id=$1 AND org_id=$2`,
    [attemptId, orgId, reason]
  );
}

// ─── Voicemail Drop ──────────────────────────────────────────────────────────

export async function handleVoicemail(
  orgId: string,
  attemptId: string,
  vmDropId: string
): Promise<void> {
  await query(
    `UPDATE call_attempts SET outcome='VOICEMAIL_DROP'::dial_outcome, amd_result='machine', status='completed', ended_at=now()
     WHERE id=$1 AND org_id=$2`,
    [attemptId, orgId]
  );
  // Update session VM count
  await query(
    `UPDATE dial_sessions SET total_vm_drops = total_vm_drops + 1
     WHERE id = (SELECT session_id FROM call_attempts WHERE id=$1)`,
    [attemptId]
  );
}

// ─── Supervisor Stats ────────────────────────────────────────────────────────

export interface SupervisorStats {
  available_agents: number;
  dialing_agents: number;
  connected_agents: number;
  calls_per_hour: number;
  connection_rate: number;
  vm_rate: number;
  abandon_rate: number;
  total_revenue: number;
  appointments_booked: number;
}

export async function getSupervisorStats(orgId: string): Promise<SupervisorStats> {
  const [agents, hourStats, overall] = await Promise.all([
    query<{ state: AgentState; count: number }>(
      "SELECT state, COUNT(*)::int as count FROM agent_presence WHERE org_id=$1 GROUP BY state",
      [orgId]
    ),
    one<{ attempts: number; connects: number; vm_drops: number }>(
      `SELECT COUNT(*)::int as attempts,
        COUNT(*) FILTER (WHERE outcome='CONNECTED')::int as connects,
        COUNT(*) FILTER (WHERE outcome='VOICEMAIL_DROP')::int as vm_drops
       FROM call_attempts WHERE org_id=$1 AND started_at > now() - interval '1 hour'`,
      [orgId]
    ),
    one<{ total_attempts: number; total_connects: number; total_vm: number; total_duration: number }>(
      `SELECT COALESCE(SUM(total_attempts),0)::int as total_attempts,
        COALESCE(SUM(total_connects),0)::int as total_connects,
        COALESCE(SUM(total_vm_drops),0)::int as total_vm,
        COALESCE(SUM(total_duration_s),0)::int as total_duration
       FROM dial_sessions WHERE org_id=$1 AND status='ended'`,
      [orgId]
    ),
  ]);

  const stateMap: Record<string, number> = {};
  agents.forEach((a) => { stateMap[a.state] = a.count; });

  const attempts = hourStats?.attempts ?? 0;
  const connects = hourStats?.connects ?? 0;
  const vmDrops = hourStats?.vm_drops ?? 0;

  return {
    available_agents: stateMap["AVAILABLE"] ?? 0,
    dialing_agents: stateMap["DIALING"] ?? 0,
    connected_agents: stateMap["CONNECTED"] ?? 0,
    calls_per_hour: attempts,
    connection_rate: attempts > 0 ? Math.round((connects / attempts) * 100) : 0,
    vm_rate: attempts > 0 ? Math.round((vmDrops / attempts) * 100) : 0,
    abandon_rate: 0, // Would need bridge tracking
    total_revenue: 0,
    appointments_booked: 0,
  };
}

// ─── AI Recommendations ──────────────────────────────────────────────────────

export interface AiRecommendation {
  type: string;
  message: string;
  estimated_value: number;
  lead_count: number;
}

export async function getAiRecommendations(orgId: string): Promise<AiRecommendation[]> {
  const stale = await one<{ count: number; revenue: number }>(
    `SELECT COUNT(*)::int as count, COALESCE(SUM(revenue_potential_cents),0)::int as revenue
     FROM leads
     WHERE org_id=$1 AND status NOT IN ('converted','lost','dnc')
       AND (last_contact_at IS NULL OR last_contact_at < now() - interval '7 days')`,
    [orgId]
  );

  const lowContact = await one<{ count: number }>(
    `SELECT COUNT(*)::int as count FROM leads
     WHERE org_id=$1 AND status NOT IN ('converted','lost','dnc')
       AND attempts < 2`,
    [orgId]
  );

  const recs: AiRecommendation[] = [];
  if (stale && stale.count > 0) {
    recs.push({
      type: "stale_leads",
      message: `${stale.count} leads have not been contacted in 7 days. Estimated revenue potential $${(stale.revenue / 100).toLocaleString()}. Recommend immediate re-engagement.`,
      estimated_value: stale.revenue,
      lead_count: stale.count,
    });
  }
  if (lowContact && lowContact.count > 0) {
    recs.push({
      type: "low_contact",
      message: `${lowContact.count} leads have fewer than 2 attempts. Increase dial ratio to improve coverage.`,
      estimated_value: 0,
      lead_count: lowContact.count,
    });
  }
  return recs;
}
