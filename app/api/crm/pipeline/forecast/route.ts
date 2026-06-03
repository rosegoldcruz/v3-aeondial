import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { pipelineForecast } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await pipelineForecast(orgId));
}