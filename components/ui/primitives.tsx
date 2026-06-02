import * as React from "react";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card p-4 md:p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub, tone = "ink" }: {
  label: string; value: string; sub?: string; tone?: "ink" | "ember" | "gain" | "loss";
}) {
  const toneCls = { ink: "text-ink", ember: "text-ember", gain: "text-gain", loss: "text-loss" }[tone];
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-1">{label}</div>
      <div className={`text-xl font-medium ${toneCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-dim mt-1">{sub}</div>}
    </div>
  );
}

export function Pill({ active, children, onClick }: {
  active?: boolean; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`pill whitespace-nowrap font-medium cursor-pointer ${active ? "pill-on" : "text-muted"}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    muted: "text-muted border-line",
    ember: "text-ember border-ember/40 bg-emberdim",
    gain: "text-gain border-gain/40",
    loss: "text-loss border-loss/40",
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${map[tone] ?? map.muted}`}>{children}</span>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.2em] text-muted mb-3">{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-16 text-muted">
      <div className="text-sm">{title}</div>
      {hint && <div className="text-xs text-dim mt-1">{hint}</div>}
    </div>
  );
}
