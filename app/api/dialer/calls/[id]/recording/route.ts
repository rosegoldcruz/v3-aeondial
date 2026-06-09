import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { getCallByProviderId } from "@/lib/telephony";

export const dynamic = "force-dynamic";

/**
 * GET /api/dialer/calls/:id/recording — Get recording URL for a call
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const call = await getCallByProviderId(params.id);
  if (!call || call.org_id !== orgId) return NextResponse.json({ error: "call not found" }, { status: 404 });
  if (!call.recording_url) {
    return NextResponse.json({ error: "no recording available" }, { status: 404 });
  }

  return NextResponse.json({ recording_url: call.recording_url });
}
