import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";
import { createLead, listLeads, type LeadFilter, type LeadSort } from "@/lib/data/leads";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const user = await getCurrentUser();
  const result = await listLeads(orgId, {
    filter: (sp.get("filter") as LeadFilter) || "all",
    search: sp.get("search") ?? undefined,
    status: sp.get("status") ?? undefined,
    sort: (sp.get("sort") as LeadSort) || "score",
    page: Number(sp.get("page") ?? "1"),
    currentUserId: user?.id ?? null,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const email = nullableText(body.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ownerDefault = await one<{ id: string }>(
    "SELECT id FROM users WHERE org_id=$1 ORDER BY created_at LIMIT 1",
    [orgId],
  );

  const lead = await createLead(orgId, {
    name,
    company: nullableText(body.company),
    email,
    phone: nullableText(body.phone),
    source: nullableText(body.source),
    campaign: nullableText(body.campaign),
    status: text(body.status) || "new",
    owner_id: text(body.owner_id) || user?.id || ownerDefault?.id || null,
    budget_range: nullableText(body.budget_range),
    pain_points: nullableText(body.pain_points),
    decision_timeline: nullableText(body.decision_timeline),
    tags: parseTags(body.tags),
    notes: nullableText(body.notes),
  });

  return NextResponse.json(lead, { status: 201 });
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
  if (typeof value === "string") {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}