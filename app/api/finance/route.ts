import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import {
  listSubscriptions, createSubscription, listTransactions, createTransaction, listEntities,
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
  const body = (await req.json()) as Record<string, unknown>;
  const entityId = text(body.entity_id) || (await listEntities(orgId))[0]?.id;
  if (!entityId) return NextResponse.json({ error: "entity required" }, { status: 400 });
  if (body.kind === "txn") {
    const description = text(body.description);
    if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });
    const t = await createTransaction({
      org_id: orgId,
      entity_id: entityId,
      description,
      amount_cents: number(body.amount_cents, 1000),
      type: text(body.type) === "in" ? "in" : "out",
      category: text(body.category) || "Ops",
      occurred_on: text(body.occurred_on) || new Date().toISOString().slice(0, 10),
    });
    return NextResponse.json(t, { status: 201 });
  }
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const s = await createSubscription({
    org_id: orgId,
    entity_id: entityId,
    name,
    amount_cents: number(body.amount_cents, 1000),
    category: text(body.category) || "Ops",
  });
  return NextResponse.json(s, { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
