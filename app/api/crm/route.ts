import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { listContacts, listDeals, createContact, createDeal } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("kind") ?? "contacts";
  return NextResponse.json(kind === "deals" ? await listDeals(orgId) : await listContacts(orgId));
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.kind === "deal") return NextResponse.json(await createDeal({ org_id: orgId, ...body }), { status: 201 });
  return NextResponse.json(await createContact({ org_id: orgId, ...body }), { status: 201 });
}
