import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { hangupCall, getCallByProviderId } from "@/lib/telephony";

export const dynamic = "force-dynamic";

/**
 * POST /api/dialer/calls/:id/hangup — Hang up an active call
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const call = await getCallByProviderId(params.id);
  if (!call || call.org_id !== orgId) return NextResponse.json({ error: "call not found" }, { status: 404 });

  await hangupCall(call.provider as "twilio" | "telnyx", params.id);
  return NextResponse.json({ success: true });
}
