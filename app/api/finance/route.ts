import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import {
  listSubscriptions, createSubscription, listTransactions, createTransaction,
} from "@/lib/data/finance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const entityId = req.nextUrl.searchParams.get("entity");
  const kind = req.nextUrl.searchParams.get("kind") ?? "subs";
  if (kind === "txns") {
    if (!entityId) return NextResponse.json({ error: "entity required" }, { status: 400 });
    return NextResponse.json(await listTransactions(orgId, entityId));
  }
  return NextResponse.json(await listSubscriptions(orgId, entityId ?? undefined));
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.kind === "txn") {
    const t = await createTransaction({ org_id: orgId, ...body });
    return NextResponse.json(t, { status: 201 });
  }
  const s = await createSubscription({ org_id: orgId, ...body });
  return NextResponse.json(s, { status: 201 });
}
