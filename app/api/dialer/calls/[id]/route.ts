import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { getCallByProviderId } from "@/lib/telephony";

export const dynamic = "force-dynamic";

/**
 * GET /api/dialer/calls/:id — Get a single call
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const call = await getCallByProviderId(params.id);
  if (!call || call.org_id !== orgId) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(call);
}
