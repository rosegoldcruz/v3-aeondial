"use client";

import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui/primitives";
import { clamp, formatDate, formatDateTime, formatShortDate, initials, money, stageTone, timeAgo } from "@/lib/ui/format";

export function PageSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6 ${className}`}>{children}</section>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">{children}</div>;
}

export function GridTwo({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">{left}{right}</div>;
}

export function GridHalves({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="grid gap-6 xl:grid-cols-2">{left}{right}</div>;
}

export function SectionCard({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`space-y-4 animate-in fade-in slide-in-from-bottom-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function ActionButton({ children, type = "button", onClick, className = "", disabled = false, title }: { children: ReactNode; type?: "button" | "submit"; onClick?: () => void; className?: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 items-center justify-center rounded-lg border border-accent/40 bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, type = "button", onClick, className = "", disabled = false, title }: { children: ReactNode; type?: "button" | "submit"; onClick?: () => void; className?: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-[120px] w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 ${props.className ?? ""}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 ${props.className ?? ""}`} />;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-secondary/70 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">{children}</thead>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top text-sm text-foreground ${className}`}>{children}</td>;
}

export function ToneBadge({ tone, children }: { tone: "muted" | "success" | "warning" | "destructive" | "accent"; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function EmptyCell({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-10 text-center">
      <div className="text-sm text-foreground">{title}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function statusTone(status: string) {
  return stageTone(status);
}

export function MetricLine({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${tone}`}>{value}</span>
    </div>
  );
}
