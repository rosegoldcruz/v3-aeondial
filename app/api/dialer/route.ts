import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  if (text(body.kind) === "dnc") {
    const phone = text(body.phone) || text(body.name);
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
    return NextResponse.json(await one(
      `INSERT INTO dnc_numbers (org_id, phone, reason)
       VALUES ($1,$2,$3)
       ON CONFLICT (org_id, phone) DO UPDATE SET reason=EXCLUDED.reason
       RETURNING *`,
      [orgId, phone, text(body.reason) || "Dialer suppression"]
    ), { status: 201 });
  }
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await one(
    `INSERT INTO campaigns (org_id, name, type, status)
     VALUES ($1,$2,'dialer',$3) RETURNING *`,
    [orgId, name, text(body.status) || "active"]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
