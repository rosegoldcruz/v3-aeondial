import * as React from "react";

// Stat card — exact pattern from salesops dashboard
export function Stat({ label, value, delta, tone = "flat" }: {
  label: string; value: string;
  delta?: { value: string; dir: "up" | "down" };
  tone?: "flat" | "up" | "down";
}) {
  return (
    <div className="group relative bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-300" />
        </div>
        <div className="flex items-end gap-3">
          <span className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight break-words">{value}</span>
          {delta && (
            <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${
              delta.dir === "up" ? "text-success" : "text-destructive"
            }`}>
              <span>{delta.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Card — matches salesops bg-card border rounded-xl
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

// Section title
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground">{children}</h3>
    </div>
  );
}

// Status badge — exact pattern: bg-success/10 text-success rounded-md
export function Badge({ children, tone = "muted" }: {
  children: React.ReactNode;
  tone?: "muted" | "success" | "warning" | "destructive" | "accent";
}) {
  const map: Record<string, string> = {
    muted:       "bg-secondary text-muted-foreground",
    success:     "bg-success/10 text-success",
    warning:     "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    accent:      "bg-accent/10 text-accent",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${map[tone] ?? map.muted}`}>
      {children}
    </span>
  );
}

// Row item — the hover pattern used in recent deals / top performers
export function Row({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-left-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

// Avatar — letter avatar matching salesops
export function Avatar({ initials, gradient = false }: { initials: string; gradient?: boolean }) {
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${
      gradient
        ? "rounded-full bg-gradient-to-br from-accent/80 to-chart-1 text-accent-foreground"
        : "bg-secondary text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-all duration-200"
    }`}>
      {initials}
    </div>
  );
}

// Progress bar — used in pipeline stages section
export function ProgressBar({ value, color = "bg-chart-1", delay = 0 }: {
  value: number; color?: string; delay?: number;
}) {
  return (
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${value}%`, transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}

export function EmptyState({ title, hint, action }: {
  title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-sm text-muted-foreground">{title}</div>
      {hint && <div className="text-xs text-muted-foreground/60 mt-1">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
