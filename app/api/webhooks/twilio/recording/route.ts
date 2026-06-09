import { NextRequest, NextResponse } from "next/server";
import { updateCallByProviderId } from "@/lib/telephony/calls";

export const dynamic = "force-dynamic";

/**
 * Twilio Recording Status Callback
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const callSid = String(form.get("CallSid") || "");
  const recordingUrl = String(form.get("RecordingUrl") || "");

  if (callSid && recordingUrl) {
    await updateCallByProviderId(callSid, { recording_url: recordingUrl });
  }

  return new NextResponse("OK", { status: 200 });
}
