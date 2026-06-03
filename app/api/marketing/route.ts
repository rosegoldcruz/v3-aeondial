import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const type = text(body.type) || "marketing";
  if (type === "email" && !process.env.SENDGRID_API_KEY) return NextResponse.json({ error: "Add API key in /admin/integrations" }, { status: 400 });
  if (type === "sms" && !process.env.TELNYX_API_KEY) return NextResponse.json({ error: "Add API key in /admin/integrations" }, { status: 400 });
  const name = text(body.name) || text(body.body);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await one(
    `INSERT INTO campaigns (org_id, name, type, status)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, name, type, text(body.status) || "draft"]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
