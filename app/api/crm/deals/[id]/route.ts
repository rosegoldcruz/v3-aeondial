import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { deleteDeal, getDealDetail, updateDeal } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deal = await getDealDetail(orgId, params.id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const deal = await updateDeal(orgId, params.id, {
    title: body.title !== undefined ? nullableText(body.title) : undefined,
    contact_id: body.contact_id !== undefined ? nullableText(body.contact_id) : undefined,
    stage: body.stage !== undefined ? dealStage(body.stage) : undefined,
    value_cents: body.value_cents !== undefined ? number(body.value_cents, null) : undefined,
    probability: body.probability !== undefined ? number(body.probability, null) : undefined,
    expected_close: body.expected_close !== undefined ? nullableText(body.expected_close) : undefined,
    next_action: body.next_action !== undefined ? nullableText(body.next_action) : undefined,
    competitor: body.competitor !== undefined ? nullableText(body.competitor) : undefined,
    notes: body.notes !== undefined ? nullableText(body.notes) : undefined,
    owner_id: body.owner_id !== undefined ? nullableText(body.owner_id) : undefined,
  });
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(deal);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const v = text(value);
  return v || null;
}

function number(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function dealStage(value: unknown) {
  const stage = text(value);
  return ["lead", "qualified", "proposal", "negotiation", "won", "lost"].includes(stage) ? stage as "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost" : undefined;
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await deleteDeal(orgId, params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}