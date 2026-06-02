import { query, one } from "@/lib/db/pool";
import type { Bid, BidLine, CatalogItem, CabinetLine } from "@/types/models";
import { bidCents } from "@/lib/bids/factors";

export async function listCatalog(orgId: string, line?: CabinetLine): Promise<CatalogItem[]> {
  if (line) {
    return query<CatalogItem>(
      "SELECT * FROM catalog_items WHERE org_id=$1 AND line=$2 ORDER BY description",
      [orgId, line]
    );
  }
  return query<CatalogItem>("SELECT * FROM catalog_items WHERE org_id=$1 ORDER BY line, description", [orgId]);
}

export async function listBids(orgId: string): Promise<Bid[]> {
  return query<Bid>("SELECT * FROM bids WHERE org_id=$1 ORDER BY updated_at DESC", [orgId]);
}

export async function getBidLines(bidId: string): Promise<BidLine[]> {
  return query<BidLine>("SELECT * FROM bid_lines WHERE bid_id=$1", [bidId]);
}

// Create a bid and compute totals using Mike-Logic factors.
export async function createBid(input: {
  org_id: string; title: string; line: CabinetLine; price_margin: number;
  lines: { catalog_item_id?: string; description: string; qty: number; list_cents: number }[];
}): Promise<Bid> {
  const bid = await one<Bid>(
    `INSERT INTO bids (org_id, title, line, price_margin, status)
     VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
    [input.org_id, input.title, input.line, input.price_margin]
  );
  let listTotal = 0, bidTotal = 0;
  for (const l of input.lines) {
    const factor = bidCents(input.line, 100000, input.price_margin) / 100000; // factor as ratio
    const lineBid = bidCents(input.line, l.list_cents, input.price_margin) * l.qty;
    const lineList = l.list_cents * l.qty;
    listTotal += lineList; bidTotal += lineBid;
    await query(
      `INSERT INTO bid_lines (bid_id, catalog_item_id, description, qty, list_cents, factor, bid_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [bid!.id, l.catalog_item_id ?? null, l.description, l.qty, l.list_cents, factor, lineBid]
    );
  }
  const updated = await one<Bid>(
    "UPDATE bids SET list_total_cents=$2, bid_total_cents=$3 WHERE id=$1 RETURNING *",
    [bid!.id, listTotal, bidTotal]
  );
  return updated!;
}
