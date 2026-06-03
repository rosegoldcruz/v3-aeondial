import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const kind = text(body.kind);
  const name = text(body.name) || text(body.title);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (kind === "catalog") {
    return NextResponse.json(await one(
      `INSERT INTO catalog_items (org_id, sku, description, line, is_accessory, list_cents)
       VALUES ($1,$2,$3,'framed',false,$4) RETURNING *`,
      [orgId, nullableText(body.sku), name, integer(body.list_cents, 10000)]
    ), { status: 201 });
  }
  if (kind === "bids") {
    return NextResponse.json(await one(
      `INSERT INTO bids (org_id, title, line, price_margin, status)
       VALUES ($1,$2,'framed',0.23,'draft') RETURNING *`,
      [orgId, name]
    ), { status: 201 });
  }
  return NextResponse.json(await one(
    `INSERT INTO inventory_items (org_id, name, sku, category, qty, cost_cents, list_cents)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, name, nullableText(body.sku), text(body.category) || "Cabinet", integer(body.qty, 1), Math.round(integer(body.list_cents, 10000) * 0.58), integer(body.list_cents, 10000)]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function integer(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
}
