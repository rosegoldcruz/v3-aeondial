import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { deleteContact, getContactDetail, updateContact } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contact = await getContactDetail(orgId, params.id);
  if (!contact) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const contact = await updateContact(orgId, params.id, {
    name: text(body.name),
    title: body.title !== undefined ? nullableText(body.title) : undefined,
    company: body.company !== undefined ? nullableText(body.company) : undefined,
    email: body.email !== undefined ? nullableText(body.email) : undefined,
    phone: body.phone !== undefined ? nullableText(body.phone) : undefined,
    linkedin: body.linkedin !== undefined ? nullableText(body.linkedin) : undefined,
    twitter: body.twitter !== undefined ? nullableText(body.twitter) : undefined,
    birthday: body.birthday !== undefined ? nullableText(body.birthday) : undefined,
    referral_source: body.referral_source !== undefined ? nullableText(body.referral_source) : undefined,
    first_contact_date: body.first_contact_date !== undefined ? nullableText(body.first_contact_date) : undefined,
    lifetime_value_cents: body.lifetime_value_cents !== undefined ? number(body.lifetime_value_cents, null) : undefined,
    notes: body.notes !== undefined ? nullableText(body.notes) : undefined,
    interests: body.interests !== undefined ? nullableText(body.interests) : undefined,
    tags: body.tags !== undefined ? parseTags(body.tags) : undefined,
    owner_id: body.owner_id !== undefined ? nullableText(body.owner_id) : undefined,
  });
  if (!contact) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await deleteContact(orgId, params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  const v = text(value);
  return v ?? null;
}

function parseTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function number(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}