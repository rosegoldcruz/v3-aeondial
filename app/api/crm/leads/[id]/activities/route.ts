import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import { logLeadActivity } from "@/lib/data/leads";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const kind = text(body.kind);
  if (!["call", "email", "note", "meeting", "task"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const durationMinutes = Number(body.duration_minutes);
  const duration_seconds =
    kind === "call" && Number.isFinite(durationMinutes) ? Math.round(durationMinutes * 60) : null;

  try {
    const result = await logLeadActivity(orgId, params.id, {
      kind,
      subject: nullableText(body.subject),
      body: nullableText(body.body),
      sentiment: text(body.sentiment) || "neutral",
      duration_seconds,
      user_id: user?.id ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const v = text(value);
  return v || null;
}