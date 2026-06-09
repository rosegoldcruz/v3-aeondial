import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { query, one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

/**
 * POST /api/dialer/disposition — Set call outcome/disposition
 * Body: { attempt_id, outcome, notes?, callback_at? }
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const attemptId = typeof body.attempt_id === "string" ? body.attempt_id : "";
  const outcome = typeof body.outcome === "string" ? body.outcome : "";
  const notes = typeof body.notes === "string" ? body.notes : null;
  const callbackAt = typeof body.callback_at === "string" ? body.callback_at : null;

  if (!attemptId || !outcome) {
    return NextResponse.json({ error: "attempt_id and outcome required" }, { status: 400 });
  }

  // Update attempt
  await query(
    `UPDATE call_attempts SET outcome=$3::dial_outcome, disposition=$4, updated_at=now()
     WHERE id=$1 AND org_id=$2`,
    [attemptId, orgId, outcome, notes]
  );

  // If callback requested, update lead status
  const attempt = await one<{ lead_id: string | null; session_id: string }>(
    "SELECT lead_id, session_id FROM call_attempts WHERE id=$1 AND org_id=$2",
    [attemptId, orgId]
  );

  if (attempt?.lead_id) {
    if (outcome === "CALLBACK_REQUESTED" && callbackAt) {
      await query(
        "UPDATE leads SET status='callback', callback_at=$2 WHERE id=$1 AND org_id=$3",
        [attempt.lead_id, callbackAt, orgId]
      );
    } else if (outcome === "SALE") {
      await query(
        "UPDATE leads SET status='converted' WHERE id=$1 AND org_id=$2",
        [attempt.lead_id, orgId]
      );
    } else if (outcome === "DNC") {
      await query(
        "UPDATE leads SET status='dnc' WHERE id=$1 AND org_id=$2",
        [attempt.lead_id, orgId]
      );
      // Add to DNC list
      const phone = await one<{ phone_number: string }>(
        "SELECT phone_number FROM call_attempts WHERE id=$1",
        [attemptId]
      );
      if (phone) {
        await query(
          `INSERT INTO dnc_list (org_id, phone, source, reason, added_by)
           VALUES ($1,$2,'manual','agent_disposition',$3)
           ON CONFLICT (org_id, phone) DO NOTHING`,
          [orgId, phone.phone_number, user.id]
        );
      }
    }
  }

  // Update session duration if bridge exists
  await query(
    `UPDATE dial_sessions SET total_duration_s = COALESCE(total_duration_s,0) + (
      SELECT COALESCE(SUM(duration_s),0) FROM call_bridges WHERE session_id=$1
    ) WHERE id=$1`,
    [attempt?.session_id]
  );

  // Set agent back to available
  await query(
    `UPDATE agent_presence SET state='AVAILABLE', current_call_id=null, updated_at=now()
     WHERE org_id=$1 AND user_id=$2`,
    [orgId, user.id]
  );

  return NextResponse.json({ success: true });
}
