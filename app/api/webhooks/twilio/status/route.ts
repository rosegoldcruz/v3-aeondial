import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId } from "@/lib/telephony/calls";

export const dynamic = "force-dynamic";

/**
 * Twilio Status Callback — fired on call state changes
 * Events: initiated, ringing, answered, completed, busy, failed, no-answer, canceled
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const callSid = String(form.get("CallSid") || "");
  const callStatus = String(form.get("CallStatus") || "");
  const duration = Number(form.get("CallDuration") || 0);
  const recordingUrl = String(form.get("RecordingUrl") || "");

  if (!callSid) return new NextResponse("Missing CallSid", { status: 400 });

  const updates: Parameters<typeof updateCallByProviderId>[1] = { status: callStatus };

  if (callStatus === "in-progress") {
    updates.answered_at = new Date().toISOString();
  }

  if (["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus)) {
    updates.ended_at = new Date().toISOString();
    if (duration > 0) updates.duration_s = duration;
  }

  if (recordingUrl) {
    updates.recording_url = recordingUrl;
  }

  await updateCallByProviderId(callSid, updates);

  return new NextResponse("OK", { status: 200 });
}
