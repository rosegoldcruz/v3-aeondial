import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { updateCallByProviderId, getCallByProviderId } from "@/lib/telephony";

export const dynamic = "force-dynamic";

/**
 * POST /api/dialer/calls/:id/disposition — Set call disposition/outcome
 * Body: { disposition: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const disposition = typeof body.disposition === "string" ? body.disposition.trim() : "";
  if (!disposition) {
    return NextResponse.json({ error: "disposition is required" }, { status: 400 });
  }

  const existing = await getCallByProviderId(params.id);
  if (!existing || existing.org_id !== orgId) return NextResponse.json({ error: "call not found" }, { status: 404 });

  const call = await updateCallByProviderId(params.id, { disposition });
  return NextResponse.json(call);
}
