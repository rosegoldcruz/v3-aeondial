import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { getDashboardInsight } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getDashboardInsight(orgId));
}

export async function POST() {
  return GET();
}
