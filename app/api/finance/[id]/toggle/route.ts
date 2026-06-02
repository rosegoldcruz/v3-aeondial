import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { toggleSubscription } from "@/lib/data/finance";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await toggleSubscription(orgId, params.id);
  return NextResponse.json({ ok: true });
}
