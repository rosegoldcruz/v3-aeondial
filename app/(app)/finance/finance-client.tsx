"use client";
import { useMemo, useState } from "react";
import { Stat, Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { fmtUSD } from "@/lib/db/money";
import type { Entity, Subscription } from "@/types/models";

const CATS = ["All", "AI", "AI Voice", "Dev", "Infra", "Media", "Ops"];

export function FinanceClient({ entities, initialSubs }: { entities: Entity[]; initialSubs: Subscription[] }) {
  const [subs, setSubs] = useState<Subscription[]>(initialSubs);
  const [entityId, setEntityId] = useState<string>(entities[0]?.id ?? "");
  const [cat, setCat] = useState("All");

  const entitySubs = useMemo(
    () => subs.filter((s) => s.entity_id === entityId),
    [subs, entityId]
  );
  const activeSubs = entitySubs.filter((s) => s.active);
  const burn = activeSubs.reduce((a, s) => a + s.amount_cents, 0);
  const allBurn = subs.filter((s) => s.active).reduce((a, s) => a + s.amount_cents, 0);
  const filtered = entitySubs.filter((s) => cat === "All" || s.category === cat);

  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of activeSubs) m[s.category] = (m[s.category] ?? 0) + s.amount_cents;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [activeSubs]);

  async function toggle(id: string) {
    setSubs((p) => p.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
    await fetch(`/api/finance/${id}/toggle`, { method: "POST" }).catch(() => {});
  }

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {entities.map((e) => (
            <Pill key={e.id} active={entityId === e.id} onClick={() => setEntityId(e.id)}>{e.name}</Pill>
          ))}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted">All-Entity Burn</div>
          <div className="text-base font-medium text-loss">{fmtUSD(allBurn)}/mo</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Monthly Burn" value={`${fmtUSD(burn)}/mo`} tone="loss" />
        <Stat label="Active Subs" value={String(activeSubs.length)} tone="ember" />
        <Stat label="Categories" value={String(byCat.length)} />
        <Stat label="Entity" value={entities.find((e) => e.id === entityId)?.name ?? "—"} />
      </div>

      <Card>
        <SectionTitle>Spend by Category</SectionTitle>
        {byCat.length === 0 ? (
          <div className="text-sm text-muted py-4 text-center">No active subscriptions for this entity.</div>
        ) : byCat.map(([c, amt]) => (
          <div key={c} className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">{c}</span>
              <span className="text-ember font-medium">{fmtUSD(amt)}/mo</span>
            </div>
            <div className="h-1.5 rounded bg-surface">
              <div className="h-1.5 rounded bg-ember" style={{ width: `${burn ? (amt / burn) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </Card>

      <div>
        <div className="flex gap-2 overflow-x-auto mb-3">
          {CATS.map((c) => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
        </div>
        {filtered.map((s) => (
          <div key={s.id} className={`card p-4 mb-2 flex items-center justify-between ${s.active ? "" : "opacity-50"}`}>
            <div>
              <div className="text-sm text-ink">{s.name}</div>
              <div className="text-[10px] text-muted">{s.category}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-ember">{fmtUSD(s.amount_cents)}/mo</div>
              <button onClick={() => toggle(s.id)} className="text-[10px] uppercase tracking-wider text-muted hover:text-ink">
                {s.active ? "Pause" : "Resume"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
