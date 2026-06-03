import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { getLeadPoolInsight } from "@/lib/data/leads";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getLeadPoolInsight(orgId));
}