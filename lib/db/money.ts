// All money stored as integer cents. Format only at the edge.
export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const toDollars = (cents: number): number => cents / 100;

export const fmtUSD = (cents: number): string => {
  const n = cents / 100;
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${s}` : `$${s}`;
};
