import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getOrgId } from "@/lib/auth/session";
import { logContactActivity } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await getCurrentUser();
  const body = (await req.json()) as Record<string, unknown>;
  const kind = text(body.kind);
  if (!["call", "email", "note", "meeting"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  const activity = await logContactActivity(orgId, params.id, {
    kind: kind as "call" | "email" | "note" | "meeting",
    subject: nullableText(body.subject),
    body: nullableText(body.body),
    sentiment: text(body.sentiment) || "neutral",
    duration_seconds: kind === "call" ? number(body.duration_seconds, null) : null,
    user_id: user?.id ?? null,
  });
  if (!activity) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(activity, { status: 201 });
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