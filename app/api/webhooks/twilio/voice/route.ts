import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId, createCallRecord } from "@/lib/telephony/calls";

export const dynamic = "force-dynamic";

/**
 * Twilio Voice Webhook — called when call connects
 * Returns TwiML to bridge agent or play hold music
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
    // Inbound call without prior record
    await createCallRecord({
      org_id: "00000000-0000-0000-0000-000000000000", // resolved via DID mapping in production
      provider: "twilio",
      provider_call_id: callSid,
      direction: direction === "inbound" ? "inbound" : "outbound",
      from_number: fromNum,
      to_number: toNum,
      status: callStatus,
    });
  }

  // Return TwiML — bridge to agent or conference
  const twiml = `\u003c?xml version="1.0" encoding="UTF-8"?\u003e
\u003cResponse\u003e
  \u003cSay voice="alice"\u003ePlease hold while we connect your call.\u003c/Say\u003e
  \u003cDial record="record-from-answer" recordingStatusCallback="${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording"\u003e
    \u003cClient\u003eaeon-agent\u003c/Client\u003e
  \u003c/Dial\u003e
\u003c/Response\u003e`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}
