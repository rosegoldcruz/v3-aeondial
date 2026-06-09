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

  // Read leadNumber query param from voice URL
  const leadNumber = req.nextUrl.searchParams.get("leadNumber");

  // Return TwiML — bridge to agent or conference
  let dialTarget = `<Client>aeon-agent</Client>`;
  if (leadNumber) {
    dialTarget = `<Number>${leadNumber}</Number>`;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect your call.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording">
    ${dialTarget}
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}
