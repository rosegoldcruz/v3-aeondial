import { NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { generateTwilioClientToken } from "@/lib/telephony/twilio-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/dialer/token — Generate Twilio Client SDK token for browser WebRTC
 */
export async function GET() {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const token = generateTwilioClientToken(user.id);
    return NextResponse.json({
      token,
      identity: user.id,
      twilioAppSid: process.env.TWILIO_TWIML_APP_SID || "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "token generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
