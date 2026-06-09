import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId, createCallRecord } from "@/lib/telephony/calls";

export const dynamic = "force-dynamic";

/**
 * Twilio Voice Webhook — called when call connects
 * Returns TwiML to bridge to agent browser client via WebRTC
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const callSid = String(form.get("CallSid") || "");
  const fromNum = String(form.get("From") || "");
  const toNum = String(form.get("To") || "");
  const direction = String(form.get("Direction") || "");
  const callStatus = String(form.get("CallStatus") || "");

  if (!callSid) return new NextResponse("Missing CallSid", { status: 400 });

  // Update or create call record
  const existing = await updateCallByProviderId(callSid, { status: callStatus });
  if (!existing) {
    await createCallRecord({
      org_id: "00000000-0000-0000-0000-000000000000",
      provider: "twilio",
      provider_call_id: callSid,
      direction: direction === "inbound" ? "inbound" : "outbound",
      from_number: fromNum,
      to_number: toNum,
      status: callStatus,
    });
  }

  // Return TwiML — bridge to browser WebRTC client
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  \u003cSay voice="alice">Please hold while we connect your call.\u003c/Say\u003e
  \u003cDial record="record-from-answer" recordingStatusCallback="${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording">
    \u003cClient>aeon-agent\u003c/Client>
  \u003c/Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}
