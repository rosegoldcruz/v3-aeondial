// Vulpine "Mike-Logic" cabinet pricing factors.
// Source of truth: rosegoldcruz/bids master sheet logic.
//   Framed:    factor = 0.185 * (0.9 + priceMargin)
//   Frameless: factor = 0.126 * (1 + priceMargin)
import type { CabinetLine } from "@/types/models";

export function bidFactor(line: CabinetLine, priceMargin: number): number {
  if (line === "framed") return 0.185 * (0.9 + priceMargin);
  return 0.126 * (1 + priceMargin);
}

// listCents * factor = bid (sale) price in cents, rounded.
export function bidCents(line: CabinetLine, listCents: number, priceMargin: number): number {
  return Math.round(listCents * bidFactor(line, priceMargin));
}
