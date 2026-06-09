import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId } from "@/lib/telephony/calls";
import { handleConnect, handleVoicemail, cancelAttempt } from "@/lib/dialer/engine";
import { query, one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

/**
 * Twilio Status Callback — fired on call state changes + AMD results
 * Events: initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
 * AMD: AnsweredBy=human, machine, fax, unknown
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const callSid = String(form.get("CallSid") || "");
  const callStatus = String(form.get("CallStatus") || "");
  const duration = Number(form.get("CallDuration") || 0);
  const recordingUrl = String(form.get("RecordingUrl") || "");
  const answeredBy = String(form.get("AnsweredBy") || "");

  if (!callSid) return new NextResponse("Missing CallSid", { status: 400 });

  // Find the attempt for this call
  const attempt = await one<{ id: string; org_id: string; session_id: string; lead_id: string | null }>(
    "SELECT id, org_id, session_id, lead_id FROM call_attempts WHERE provider_call_id=$1",
    [callSid]
  );

  // ─── AMD DETECTION ─────────────────────────────────────────────────────────
  if (answeredBy === "machine_start" || answeredBy === "machine_end_beep" || answeredBy === "machine_end_silence") {
    // Voicemail detected — play drop and hang up
    if (attempt) {
      // Get VM drop for this session's campaign
      const vm = await query<{ audio_url: string }>(
        `SELECT vd.audio_url FROM voicemail_drops vd
         JOIN dial_sessions ds ON ds.campaign_id = vd.campaign_id
         WHERE ds.id = $1 LIMIT 1`,
        [attempt.session_id]
      );
      if (vm[0]) {
        // Return TwiML to play VM drop
        const twiml = `\u003c?xml version="1.0" encoding="UTF-8"?\u003e
\u003cResponse\u003e
  \u003cPlay\u003e${vm[0].audio_url}\u003c/Play\u003e
  \u003cHangup/\u003e
\u003c/Response\u003e`;
        await handleVoicemail(attempt.org_id, attempt.id, "");
        return new NextResponse(twiml, { headers: { "Content-Type": "application/xml" } });
      }
      await handleVoicemail(attempt.org_id, attempt.id, "");
    }
    await updateCallByProviderId(callSid, { status: "voicemail", ended_at: new Date().toISOString() });
    return new NextResponse("OK", { status: 200 });
  }

  if (answeredBy === "fax") {
    if (attempt) await cancelAttempt(attempt.org_id, attempt.id, "FAX_DETECTED");
    await updateCallByProviderId(callSid, { status: "fax", ended_at: new Date().toISOString() });
    return new NextResponse("OK", { status: 200 });
  }

  // ─── HUMAN ANSWERED ────────────────────────────────────────────────────────
  if (callStatus === "in-progress" && (!answeredBy || answeredBy === "human")) {
    await updateCallByProviderId(callSid, { status: callStatus, answered_at: new Date().toISOString() });

    if (attempt) {
      // Get user_id from session
      const session = await one<{ user_id: string }>(
        "SELECT user_id FROM dial_sessions WHERE id=$1",
        [attempt.session_id]
      );
      if (session) {
        const result = await handleConnect(attempt.org_id, attempt.session_id, attempt.id, session.user_id, answeredBy || "human");
        if (!result.bridged) {
          // Another call already won — hang this one up
          return new NextResponse(`\u003c?xml version="1.0"?\u003e\u003cResponse\u003e\u003cHangup/\u003e\u003c/Response\u003e`, {
            headers: { "Content-Type": "application/xml" },
          });
        }
      }
    }
    return new NextResponse("OK", { status: 200 });
  }

  // ─── STANDARD STATUS UPDATES ───────────────────────────────────────────────
  const updates: Parameters<typeof updateCallByProviderId>[1] = { status: callStatus };

  if (callStatus === "in-progress") {
    updates.answered_at = new Date().toISOString();
  }

  if (["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus)) {
    updates.ended_at = new Date().toISOString();
    if (duration > 0) updates.duration_s = duration;
    // Mark attempt as ended
    if (attempt) {
      const outcome = callStatus === "busy" ? "BUSY" : callStatus === "no-answer" ? "NO_ANSWER" : callStatus === "failed" ? "FAILED" : "DISCONNECTED";
      await query(
        `UPDATE call_attempts SET status='completed', ended_at=now(), outcome=$3::dial_outcome, duration_s=$4
         WHERE id=$1 AND org_id=$2`,
        [attempt.id, attempt.org_id, outcome, duration]
      );
    }
  }

  if (recordingUrl) {
    updates.recording_url = recordingUrl;
  }

  await updateCallByProviderId(callSid, updates);

  return new NextResponse("OK", { status: 200 });
}
