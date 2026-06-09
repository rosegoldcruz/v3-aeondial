import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { originateCall, listCalls, initCallEventLoop, createCallRecord } from "@/lib/telephony";

export const dynamic = "force-dynamic";

/**
 * POST /api/dialer/calls — Originate an outbound call
 * Body: { toNumber, leadId?, contactId?, fromNumber?, record? }
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await getCurrentUser();
  const body = (await req.json()) as Record<string, unknown>;

  const toNumber = typeof body.toNumber === "string" ? body.toNumber.trim() : "";
  if (!toNumber) {
    return NextResponse.json({ error: "toNumber is required" }, { status: 400 });
  }

  // Ensure event loop is initialized
  await initCallEventLoop();

  try {
    const result = await originateCall({
      orgId,
      userId: user?.id,
      leadId: typeof body.leadId === "string" ? body.leadId : undefined,
      contactId: typeof body.contactId === "string" ? body.contactId : undefined,
      toNumber,
      fromNumber: typeof body.fromNumber === "string" ? body.fromNumber : undefined,
      record: body.record === true,
    });

    // Persist call record
    const call = await createCallRecord({
      org_id: orgId,
      user_id: user?.id,
      lead_id: typeof body.leadId === "string" ? body.leadId : undefined,
      contact_id: typeof body.contactId === "string" ? body.contactId : undefined,
      provider: result.provider,
      provider_call_id: result.callSid,
      direction: "outbound",
      from_number: result.from,
      to_number: result.to,
      status: result.status,
    });

    return NextResponse.json(call, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "originate failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/dialer/calls — List recent calls
 * Query: ?limit=50
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);
  const calls = await listCalls(orgId, limit);
  return NextResponse.json(calls);
}
