import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { deleteLead, getLeadWithActivities, updateLead } from "@/lib/data/leads";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const lead = await getLeadWithActivities(orgId, params.id);
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const lead = await updateLead(orgId, params.id, {
    name: text(body.name) || undefined,
    company: body.company !== undefined ? nullableText(body.company) : undefined,
    email: body.email !== undefined ? nullableText(body.email) : undefined,
    phone: body.phone !== undefined ? nullableText(body.phone) : undefined,
    status: text(body.status) || undefined,
    source: body.source !== undefined ? nullableText(body.source) : undefined,
    campaign: body.campaign !== undefined ? nullableText(body.campaign) : undefined,
    owner_id: body.owner_id !== undefined ? (text(body.owner_id) || null) : undefined,
    budget_range: body.budget_range !== undefined ? nullableText(body.budget_range) : undefined,
    pain_points: body.pain_points !== undefined ? nullableText(body.pain_points) : undefined,
    decision_timeline: body.decision_timeline !== undefined ? nullableText(body.decision_timeline) : undefined,
    tags: body.tags !== undefined ? parseTags(body.tags) : undefined,
    notes: body.notes !== undefined ? nullableText(body.notes) : undefined,
    sentiment: text(body.sentiment) || undefined,
  });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await deleteLead(orgId, params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const v = text(value);
  return v || null;
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}