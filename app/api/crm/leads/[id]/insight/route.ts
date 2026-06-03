import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { getLeadInsight } from "@/lib/data/leads";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getLeadInsight(orgId, params.id));
}