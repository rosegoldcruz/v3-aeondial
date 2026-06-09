import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { query, one } from "@/lib/db/pool";
import { hangupCall } from "@/lib/telephony/providers";

export const dynamic = "force-dynamic";

/**
 * POST /api/dialer/transfer — Transfer active call to another agent
 * Body: { attempt_id, target_user_id }
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const attemptId = typeof body.attempt_id === "string" ? body.attempt_id : "";
  const targetUserId = typeof body.target_user_id === "string" ? body.target_user_id : "";

  if (!attemptId || !targetUserId) {
    return NextResponse.json({ error: "attempt_id and target_user_id required" }, { status: 400 });
  }

  // Get attempt + bridge
  const attempt = await one<{ provider_call_id: string; provider: string; session_id: string }>(
    "SELECT provider_call_id, provider, session_id FROM call_attempts WHERE id=$1 AND org_id=$2",
    [attemptId, orgId]
  );
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });

  // Update bridge to new user
  await query(
    "UPDATE call_bridges SET user_id=$3 WHERE winning_attempt_id=$1 AND org_id=$2",
    [attemptId, orgId, targetUserId]
  );

  // Update agent states
  await query(
    "UPDATE agent_presence SET state='AVAILABLE', current_call_id=null WHERE org_id=$1 AND user_id=$2",
    [orgId, user.id]
  );
  await query(
    "UPDATE agent_presence SET state='CONNECTED', current_call_id=$3 WHERE org_id=$1 AND user_id=$2",
    [orgId, targetUserId, attemptId]
  );

  return NextResponse.json({ success: true, message: "Call transferred" });
}
