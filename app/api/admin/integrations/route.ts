import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { query, one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = ["SENDGRID_API_KEY", "TELNYX_API_KEY", "GOOGLE_DRIVE_CLIENT_ID", "TWILIO_ACCOUNT_SID", "DEEPSEEK_API_KEY"] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(value: unknown): value is AllowedKey {
  return typeof value === "string" && ALLOWED_KEYS.includes(value as AllowedKey);
}

export async function GET(_req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await query<{ key: string; value: string }>(
    "SELECT key, value FROM org_settings WHERE org_id=$1",
    [orgId]
  );
  const result: Record<string, boolean> = {};
  for (const key of ALLOWED_KEYS) {
    const row = rows.find((r) => r.key === key);
    result[key] = Boolean(row?.value);
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const key = body.key;
  const value = body.value;
  if (!isAllowedKey(key)) {
    return NextResponse.json({ error: `key must be one of: ${ALLOWED_KEYS.join(", ")}` }, { status: 400 });
  }
  if (typeof value !== "string" || !value.trim()) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }
  const row = await one<{ key: string; value: string }>(
    `INSERT INTO org_settings (org_id, key, value, updated_at)
     VALUES ($1,$2,$3,now())
     ON CONFLICT (org_id, key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()
     RETURNING key, value`,
    [orgId, key, value.trim()]
  );
  return NextResponse.json({ ok: true, key: row?.key, saved: true }, { status: 200 });
}
