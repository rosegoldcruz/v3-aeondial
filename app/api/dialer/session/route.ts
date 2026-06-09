import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import {
  createSession, endSession, getActiveSession,
  setAgentState, getAgentPresence,
  getNextLeads, placeBatch, handleConnect, handleVoicemail,
  getSupervisorStats, getAiRecommendations,
  isDnc, isQuietHours,
} from "@/lib/dialer/engine";
import { query, one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

// GET /api/dialer/session — get current session + agent state
export async function GET() {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await getActiveSession(orgId, user.id);
  const presence = await getAgentPresence(orgId, user.id);

  return NextResponse.json({ session, presence });
}

// POST /api/dialer/session — start or control session
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";

  // ─── START SESSION ────────────────────────────────────────────────────────
  if (action === "start") {
    // End any existing session
    const existing = await getActiveSession(orgId, user.id);
    if (existing) {
      await endSession(existing.id, orgId);
    }

    const dialRatio = typeof body.dial_ratio === "number" ? body.dial_ratio : 3;
    const campaignId = typeof body.campaign_id === "string" ? body.campaign_id : null;
    const session = await createSession(orgId, user.id, campaignId, Math.min(Math.max(dialRatio, 1), 5));
    if (!session) return NextResponse.json({ error: "failed to create session" }, { status: 500 });
    await setAgentState(orgId, user.id, "AVAILABLE", session.id);

    // Auto-queue first batch
    const leads = await getNextLeads(orgId, session.campaign_id, session.dial_ratio);
    if (leads.length > 0) {
      const cleanLeads = [];
      for (const lead of leads) {
        if (await isDnc(orgId, lead.phone)) {
          await query(
            `INSERT INTO call_attempts (org_id, session_id, lead_id, phone_number, status, outcome)
             VALUES ($1,$2,$3,$4,'cancelled','DNC'::dial_outcome)`,
            [orgId, session.id, lead.id, lead.phone]
          );
        } else {
          cleanLeads.push(lead);
        }
      }
      if (cleanLeads.length > 0) {
        await setAgentState(orgId, user.id, "DIALING", session.id);
        const attempts = await placeBatch(orgId, session.id, cleanLeads, "", null);
        await setAgentState(orgId, user.id, "WAITING_FOR_CONNECT", session.id);
        return NextResponse.json({
          session,
          leads: cleanLeads,
          attempts,
          message: `Session started. Dialing ${attempts.length} leads. First human answer wins.`,
        });
      }
    }

    return NextResponse.json({ session, message: "Session started. No leads available — click 'Next Batch' when ready." });
  }

  // ─── END SESSION ──────────────────────────────────────────────────────────
  if (action === "end") {
    const existing = await getActiveSession(orgId, user.id);
    if (existing) {
      await endSession(existing.id, orgId);
    }
    await setAgentState(orgId, user.id, "OFFLINE");
    return NextResponse.json({ message: "Session ended" });
  }

  // ─── NEXT BATCH ───────────────────────────────────────────────────────────
  if (action === "next_batch") {
    const session = await getActiveSession(orgId, user.id);
    if (!session) return NextResponse.json({ error: "no active session" }, { status: 400 });

    await setAgentState(orgId, user.id, "DIALING", session.id);

    // Get leads
    const leads = await getNextLeads(orgId, session.campaign_id, session.dial_ratio);
    if (leads.length === 0) {
      await setAgentState(orgId, user.id, "AVAILABLE", session.id);
      return NextResponse.json({ message: "No leads available", leads: [] });
    }

    // Check compliance
    const rules = await query<{ dial_ratio: number; require_amd: boolean; vm_drop_id: string | null; quiet_hours_start: number | null; quiet_hours_end: number | null; timezone: string }>(
      "SELECT * FROM campaign_rules WHERE org_id=$1 AND active=true LIMIT 1",
      [orgId]
    );
    const rule = rules[0] ?? null;

    if (rule && isQuietHours({ ...rule, id: '', org_id: orgId, campaign_id: null, max_attempts: 5, attempt_delay_m: 60, active: true })) {
      await setAgentState(orgId, user.id, "AVAILABLE", session.id);
      return NextResponse.json({ error: "quiet hours — cannot dial" }, { status: 403 });
    }

    // Filter DNC
    const cleanLeads = [];
    for (const lead of leads) {
      if (await isDnc(orgId, lead.phone)) {
        // Log DNC skip
        await query(
          `INSERT INTO call_attempts (org_id, session_id, lead_id, phone_number, status, outcome)
           VALUES ($1,$2,$3,$4,'cancelled','DNC'::dial_outcome)`,
          [orgId, session.id, lead.id, lead.phone]
        );
      } else {
        cleanLeads.push(lead);
      }
    }

    if (cleanLeads.length === 0) {
      await setAgentState(orgId, user.id, "AVAILABLE", session.id);
      return NextResponse.json({ message: "All leads filtered by compliance", leads: [] });
    }

    // Get VM drop if configured
    let vmDrop: { id: string; name: string; audio_url: string; org_id: string; campaign_id: string | null; duration_s: number | null } | null = null;
    if (rule?.vm_drop_id) {
      const vm = await query<{ id: string; name: string; audio_url: string; org_id: string; campaign_id: string | null; duration_s: number | null }>(
        "SELECT id, name, audio_url, org_id, campaign_id, duration_s FROM voicemail_drops WHERE id=$1 AND org_id=$2",
        [rule.vm_drop_id, orgId]
      );
      vmDrop = vm[0] ?? null;
    }

    // Place batch
    const agentPhone = typeof body.agent_phone === "string" ? body.agent_phone : "";
    const attempts = await placeBatch(orgId, session.id, cleanLeads, agentPhone, vmDrop);

    await setAgentState(orgId, user.id, "WAITING_FOR_CONNECT", session.id);

    return NextResponse.json({
      session,
      leads: cleanLeads,
      attempts,
      message: `Dialing ${attempts.length} leads. First human answer wins.`,
    });
  }

  // ─── SET AGENT STATE ──────────────────────────────────────────────────────
  if (action === "set_state") {
    const state = typeof body.state === "string" ? body.state : "AVAILABLE";
    const session = await getActiveSession(orgId, user.id);
    await setAgentState(orgId, user.id, state as any, session?.id);
    return NextResponse.json({ state });
  }

  // ─── SUPERVISOR STATS ─────────────────────────────────────────────────────
  if (action === "supervisor_stats") {
    const stats = await getSupervisorStats(orgId);
    return NextResponse.json(stats);
  }

  // ─── AI RECOMMENDATIONS ───────────────────────────────────────────────────
  if (action === "ai_recommendations") {
    const recs = await getAiRecommendations(orgId);
    return NextResponse.json(recs);
  }

  // ─── VM DROP LIBRARY ──────────────────────────────────────────────────────
  if (action === "list_vm_drops") {
    const rows = await query<{ id: string; name: string; audio_url: string; duration_s: number | null; created_at: string }>(
      "SELECT id, name, audio_url, duration_s, created_at FROM voicemail_drops WHERE org_id=$1 ORDER BY created_at DESC",
      [orgId]
    );
    return NextResponse.json(rows);
  }

  if (action === "create_vm_drop") {
    const name = str(body.name);
    const audioUrl = str(body.audio_url);
    if (!name || !audioUrl) return NextResponse.json({ error: "name and audio_url required" }, { status: 400 });
    const drop = await one(
      `INSERT INTO voicemail_drops (org_id, name, audio_url, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [orgId, name, audioUrl, user.id]
    );
    return NextResponse.json(drop, { status: 201 });
  }

  // ─── CAMPAIGN RULES ───────────────────────────────────────────────────────
  if (action === "list_rules") {
    const rows = await query<{ id: string; dial_ratio: number; max_attempts: number; attempt_delay_m: number; quiet_hours_start: number | null; quiet_hours_end: number | null; timezone: string; require_amd: boolean; active: boolean }>(
      "SELECT id, dial_ratio, max_attempts, attempt_delay_m, quiet_hours_start, quiet_hours_end, timezone, require_amd, active FROM campaign_rules WHERE org_id=$1 ORDER BY created_at DESC",
      [orgId]
    );
    return NextResponse.json(rows);
  }

  if (action === "create_rule") {
    const rule = await one(
      `INSERT INTO campaign_rules (org_id, dial_ratio, max_attempts, attempt_delay_m, quiet_hours_start, quiet_hours_end, timezone, require_amd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orgId, num(body.dial_ratio, 3), num(body.max_attempts, 5), num(body.attempt_delay_m, 60),
       body.quiet_hours_start ? Number(body.quiet_hours_start) : null,
       body.quiet_hours_end ? Number(body.quiet_hours_end) : null,
       str(body.timezone) || "America/Chicago", body.require_amd === true]
    );
    return NextResponse.json(rule, { status: 201 });
  }

  // ─── DNC LIST ─────────────────────────────────────────────────────────────
  if (action === "list_dnc") {
    const rows = await query<{ id: string; phone: string; reason: string | null; added_at: string }>(
      "SELECT id, phone, reason, added_at FROM dnc_list WHERE org_id=$1 ORDER BY added_at DESC",
      [orgId]
    );
    return NextResponse.json(rows);
  }

  if (action === "add_dnc") {
    const phone = str(body.phone);
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
    await query(
      `INSERT INTO dnc_list (org_id, phone, reason, added_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (org_id, phone) DO UPDATE SET reason=$3, added_by=$4, added_at=now()`,
      [orgId, phone, str(body.reason) || "manual", user.id]
    );
    return NextResponse.json({ success: true });
  }

  if (action === "remove_dnc") {
    const id = str(body.id);
    await query("DELETE FROM dnc_list WHERE id=$1 AND org_id=$2", [id, orgId]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return isNaN(n) ? fallback : n;
}
