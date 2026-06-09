import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId, createCallRecord } from "@/lib/telephony/calls";

export const dynamic = "force-dynamic";

/**
 * Telnyx Webhook — handles call events via call_control_id
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const eventType = String(body?.event_type || "");
  const payload = (body?.payload || {}) as Record<string, unknown>;
  const callControlId = String(payload?.call_control_id || payload?.call_leg_id || "");

  if (!callControlId) return new NextResponse("Missing call_control_id", { status: 400 });

  const statusMap: Record<string, string> = {
    "call.initiated": "initiated",
    "call.answered": "in-progress",
    "call.hangup": "completed",
    "call.bridged": "in-progress",
    "call.recording.saved": "completed",
  };

  const mappedStatus = statusMap[eventType] || String(payload?.state || "unknown");

  const existing = await updateCallByProviderId(callControlId, { status: mappedStatus });

  if (!existing && eventType === "call.initiated") {
    await createCallRecord({
      org_id: "00000000-0000-0000-0000-000000000000",
      provider: "telnyx",
      provider_call_id: callControlId,
      direction: payload?.direction === "incoming" ? "inbound" : "outbound",
      from_number: String(payload?.from || ""),
      to_number: String(payload?.to || ""),
      status: mappedStatus,
    });
  }

  if (eventType === "call.answered") {
    await updateCallByProviderId(callControlId, { answered_at: new Date().toISOString() });
  }

  if (eventType === "call.hangup" || eventType === "call.recording.saved") {
    const endedAt = payload?.end_time ? new Date(String(payload.end_time)).toISOString() : new Date().toISOString();
    const duration = Number(payload?.duration || 0);
    const recording = String(payload?.recording_url || "");
    await updateCallByProviderId(callControlId, {
      status: mappedStatus,
      ended_at: endedAt,
      ...(duration > 0 ? { duration_s: duration } : {}),
      ...(recording ? { recording_url: recording } : {}),
    });
  }

  return new NextResponse("OK", { status: 200 });
}
