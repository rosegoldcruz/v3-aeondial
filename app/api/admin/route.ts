import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  if (text(body.kind) === "users") {
    const email = text(body.email);
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    return NextResponse.json(await one(
      `INSERT INTO users (org_id, email, name, role, active)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT (org_id, email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role
       RETURNING id, org_id, email, name, role, active, avatar_url, created_at`,
      [orgId, email, text(body.name) || text(body.title) || email, role(body.role) || role(body.category)]
    ), { status: 201 });
  }
  return NextResponse.json(await one(
    `INSERT INTO audit_log (org_id, action, resource, resource_id, ip)
     VALUES ($1,'update',$2,$3,'127.0.0.1') RETURNING *`,
    [orgId, text(body.kind) || "settings", text(body.name) || text(body.title) || "settings"]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function role(value: unknown): "owner" | "admin" | "manager" | "employee" {
  const candidate = text(value);
  return ["owner", "admin", "manager", "employee"].includes(candidate) ? candidate as "owner" | "admin" | "manager" | "employee" : "employee";
}
