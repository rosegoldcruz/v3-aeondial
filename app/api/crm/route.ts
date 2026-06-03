import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { listContacts, listDeals, createContact, createDeal } from "@/lib/data/crm";
import { one } from "@/lib/db/pool";

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
  const body = (await req.json()) as Record<string, unknown>;
  const kind = String(body.kind ?? "contact");
  if (kind === "lead") {
    const name = text(body.name);
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const owner = await one<{ id: string }>("SELECT id FROM users WHERE org_id=$1 ORDER BY created_at LIMIT 1", [orgId]);
    const lead = await one(
      `INSERT INTO leads (org_id, name, company, email, phone, status, source, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orgId, name, nullableText(body.company), nullableText(body.email), nullableText(body.phone), text(body.status) || "new", nullableText(body.source), owner?.id ?? null]
    );
    return NextResponse.json(lead, { status: 201 });
  }
  if (kind === "campaign") {
    const name = text(body.name);
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const campaign = await one(
      `INSERT INTO campaigns (org_id, name, type, status)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [orgId, name, text(body.type) || "marketing", text(body.status) || "draft"]
    );
    return NextResponse.json(campaign, { status: 201 });
  }
  if (kind === "activity") {
    const subject = text(body.title) || text(body.subject);
    if (!subject) return NextResponse.json({ error: "subject required" }, { status: 400 });
    const activity = await one(
      `INSERT INTO activities (org_id, kind, subject, body)
       VALUES ($1,'note',$2,$3) RETURNING *`,
      [orgId, subject, nullableText(body.body)]
    );
    return NextResponse.json(activity, { status: 201 });
  }
  if (kind === "deal") {
    const title = text(body.title);
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    return NextResponse.json(await createDeal({ org_id: orgId, title, value_cents: number(body.value_cents, 100000), stage: dealStage(body.stage) }), { status: 201 });
  }
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createContact({ org_id: orgId, name, company: nullableText(body.company) ?? undefined, email: nullableText(body.email) ?? undefined, phone: nullableText(body.phone) ?? undefined }), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const v = text(value);
  return v || null;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dealStage(value: unknown) {
  const stage = text(value);
  return ["lead", "qualified", "proposal", "negotiation", "won", "lost"].includes(stage) ? stage as "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost" : "lead";
}
