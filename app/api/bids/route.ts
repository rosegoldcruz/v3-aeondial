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
    title?: string;
    line?: CabinetLine;
    price_margin?: number;
    lines?: { catalog_item_id?: string; description: string; qty: number; list_cents: number }[];
  };
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.line || (body.line !== "framed" && body.line !== "frameless")) {
    return NextResponse.json({ error: "line must be 'framed' or 'frameless'" }, { status: 400 });
  }
  if (body.price_margin === undefined || body.price_margin === null || typeof body.price_margin !== "number" || !Number.isFinite(body.price_margin)) {
    return NextResponse.json({ error: "price_margin is required and must be a number" }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "lines must be a non-empty array" }, { status: 400 });
  }
  return NextResponse.json(await createBid({
    org_id: orgId,
    title: body.title.trim(),
    line: body.line,
    price_margin: body.price_margin,
    lines: body.lines,
  }), { status: 201 });
}

function cabinetLine(value: string | null): CabinetLine | null {
  return value === "framed" || value === "frameless" ? value : null;
}
