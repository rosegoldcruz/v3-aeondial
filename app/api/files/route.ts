import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const title = text(body.title) || text(body.name);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  return NextResponse.json(await one(
    `INSERT INTO rag_documents (org_id, source, title, status)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, text(body.source) || "upload", title, text(body.status) || "pending"]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
