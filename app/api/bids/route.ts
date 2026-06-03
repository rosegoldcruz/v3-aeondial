import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { listBids, createBid, listCatalog } from "@/lib/data/bids";
import type { CabinetLine } from "@/types/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("kind") ?? "bids";
  if (kind === "catalog") {
    const line = cabinetLine(req.nextUrl.searchParams.get("line"));
    return NextResponse.json(await listCatalog(orgId, line ?? undefined));
  }
  return NextResponse.json(await listBids(orgId));
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    title: string;
    line: CabinetLine;
    price_margin: number;
    lines: { catalog_item_id?: string; description: string; qty: number; list_cents: number }[];
  };
  return NextResponse.json(await createBid({ org_id: orgId, ...body }), { status: 201 });
}

function cabinetLine(value: string | null): CabinetLine | null {
  return value === "framed" || value === "frameless" ? value : null;
}
