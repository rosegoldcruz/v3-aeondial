"use client";
import { useState } from "react";
import { Card, Stat, SectionTitle, Badge } from "@/components/ui/primitives";
import { fmtUSD, toCents } from "@/lib/db/money";
import { bidFactor, bidCents } from "@/lib/bids/factors";
import type { Bid, CabinetLine } from "@/types/models";

export function BidsClient({ bids }: { bids: Bid[] }) {
  const [line, setLine] = useState<CabinetLine>("framed");
  const [margin, setMargin] = useState(0.23);
  const [list, setList] = useState("");

  const listC = toCents(parseFloat(list || "0"));
  const factor = bidFactor(line, margin);
  const out = bidCents(line, listC, margin);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <Card>
        <SectionTitle>Mike-Logic Calculator</SectionTitle>
        <div className="flex gap-2 mb-4">
          <Segment active={line === "framed"} onClick={() => setLine("framed")}>Framed</Segment>
          <Segment active={line === "frameless"} onClick={() => setLine("frameless")}>Frameless</Segment>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">List Price ($)</span>
            <input value={list} onChange={(e) => setList(e.target.value)} type="number"
              className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground text-sm outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Price Margin</span>
            <input value={margin} onChange={(e) => setMargin(parseFloat(e.target.value || "0"))} type="number" step="0.01"
              className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground text-sm outline-none focus:border-accent" />
          </label>
          <div className="flex items-end">
            <Badge tone="accent">factor {factor.toFixed(5)}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="List" value={fmtUSD(listC)} />
          <Stat label="Factor" value={factor.toFixed(4)} tone="up" />
          <Stat label="Bid Price" value={fmtUSD(out)} tone="up" />
        </div>
      </Card>

      <div>
        <SectionTitle>Saved Bids</SectionTitle>
        {bids.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No bids saved yet.</div>
        ) : bids.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">{b.title}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.line} · margin {b.price_margin}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-success">{fmtUSD(b.bid_total_cents)}</div>
              <Badge tone={b.status === "accepted" ? "success" : "muted"}>{b.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Segment({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
