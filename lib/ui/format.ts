import { fmtUSD } from "@/lib/db/money";

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "No timestamp";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function timeAgo(value: string | null | undefined) {
  if (!value) return "just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function money(value: number | string) {
  return fmtUSD(Number(value));
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function stageTone(stage: string) {
  if (stage === "won" || stage === "qualified" || stage === "active" || stage === "indexed" || stage === "approved") return "success" as const;
  if (stage === "proposal" || stage === "contacted" || stage === "pending" || stage === "paused" || stage === "in_progress") return "warning" as const;
  if (stage === "lost" || stage === "disqualified" || stage === "error" || stage === "rejected" || stage === "inactive") return "destructive" as const;
  if (stage === "lead" || stage === "new" || stage === "draft") return "accent" as const;
  return "muted" as const;
}
