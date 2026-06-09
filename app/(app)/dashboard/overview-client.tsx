"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { RevenueAreaChart } from "@/components/pages/charts";
import { PageSection } from "@/components/pages/common";
import { Avatar, Badge, ProgressBar, Row } from "@/components/ui/primitives";
import type {
  DashboardInsight,
  DashboardKPIs,
  HeatmapDay,
  IntegrationStatus,
  KPIDelta,
  PipelineStageItem,
  PriorityAction,
  RecentDeal,
  RecentLead,
  TrendPoint,
} from "@/lib/data/dashboard";
import { fmtUSD } from "@/lib/db/money";
import { initials, money, stageTone, timeAgo } from "@/lib/ui/format";

interface OverviewClientProps {
  kpis: DashboardKPIs;
  deltas: {
    pipelineDelta: KPIDelta | null;
    wonDelta: KPIDelta | null;
    burnDelta: KPIDelta | null;
    leadsDelta: KPIDelta | null;
  };
  priorityActions: PriorityAction[];
  recentDeals: RecentDeal[];
  recentLeads: RecentLead[];
  revenueTrend: TrendPoint[];
  pipelineStages: { items: PipelineStageItem[]; totalValueCents: number };
  heatmap: HeatmapDay[];
  integrations: IntegrationStatus[];
  initialInsight: DashboardInsight;
}

const SEVERITY_STYLES = {
  URGENT: { badge: "destructive" as const, icon: "bg-destructive/15 text-destructive" },
  HIGH: { badge: "warning" as const, icon: "bg-warning/15 text-warning" },
  INFO: { badge: "accent" as const, icon: "bg-accent/15 text-accent" },
};

function formatPipelineTotal(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return fmtUSD(cents);
}

function PulseCard({
  label,
  subtext,
  value,
  valueClass,
  delta,
  delay,
}: {
  label: string;
  subtext: string;
  value: string;
  valueClass: string;
  delta?: KPIDelta | null;
  delay: number;
}) {
  return (
    <div
      className="group relative bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="mb-1">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground/80 mb-3">{subtext}</p>
        <div className="flex items-end gap-2 flex-wrap">
          <span className={`text-2xl lg:text-3xl font-bold tracking-tight ${valueClass}`}>{value}</span>
          {delta ? (
            <span className={`text-sm font-medium mb-1 ${delta.dir === "up" ? "text-success" : "text-destructive"}`}>
              {delta.dir === "up" ? "+" : "−"}
              {delta.value}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildHeatmapCells(days: HeatmapDay[]) {
  const countByDate = new Map(days.map((d) => [String(d.date).slice(0, 10), Number(d.count)]));
  const cells: number[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(countByDate.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return cells;
}

function boldActionText(text: string) {
  const match = text.match(/^(Follow up with|Proposal stage has|(\d+) deals stagnant|(\d+) overdue|No DNC)/);
  if (!match) return text;
  const parts = text.split(/ — | — |\. /);
  if (parts.length < 2) return <span className="text-foreground">{text}</span>;
  return (
    <span className="text-foreground">
      <span className="font-semibold">{parts[0]}</span>
      {text.slice(parts[0].length)}
    </span>
  );
}

export function OverviewClient({
  kpis,
  deltas,
  priorityActions,
  recentDeals,
  recentLeads,
  revenueTrend,
  pipelineStages,
  heatmap,
  integrations,
  initialInsight,
}: OverviewClientProps) {
  const router = useRouter();
  const [insight, setInsight] = useState(initialInsight);
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState(false);

  const heatmapCells = useMemo(() => buildHeatmapCells(heatmap), [heatmap]);
  const heatmapMax = useMemo(() => Math.max(1, ...heatmapCells), [heatmapCells]);

  const stageTotal = pipelineStages.items.reduce((sum, item) => sum + item.count, 0);

  const chartData = revenueTrend.map((point) => ({
    label: point.label,
    revenue: point.revenue,
    pipeline: point.pipeline,
  }));

  const refreshInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/dashboard/insights", { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as DashboardInsight;
        setInsight(data);
        setRefreshedAt(Date.now());
      }
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshInsight();
  }, [refreshInsight]);

  const minutesAgo = Math.max(0, Math.floor((Date.now() - refreshedAt) / 60_000));

  async function sendFollowUpEmail() {
    if (!emailConfirm) {
      setEmailConfirm(true);
      return;
    }
    setEmailBusy(true);
    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          name: "Qualified leads follow-up",
          status: "draft",
        }),
      });
      if (res.ok) {
        setEmailConfirm(false);
        alert("Follow-up campaign draft created.");
      } else {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "Could not send follow-up.");
      }
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <PageSection>
      {/* Section A: Pulse Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <PulseCard
          label="Pipeline Value"
          subtext="active deal value"
          value={money(kpis.pipelineValueCents)}
          valueClass="text-accent"
          delta={deltas.pipelineDelta}
          delay={0}
        />
        <PulseCard
          label="Won This Month"
          subtext="closed won"
          value={money(kpis.wonThisMonthCents)}
          valueClass="text-success"
          delta={deltas.wonDelta}
          delay={75}
        />
        <PulseCard
          label="Monthly Burn"
          subtext="all entities"
          value={money(kpis.monthlyBurnCents)}
          valueClass="text-destructive"
          delta={deltas.burnDelta}
          delay={150}
        />
        <PulseCard
          label="New Leads"
          subtext="this week"
          value={String(kpis.newLeadsCount)}
          valueClass="text-accent"
          delta={deltas.leadsDelta}
          delay={225}
        />
        <PulseCard
          label="Conversion Rate"
          subtext="win rate"
          value={`${kpis.conversionRate}%`}
          valueClass="text-foreground"
          delay={300}
        />
        <PulseCard
          label="Open Tasks"
          subtext="need action"
          value={String(kpis.openTasksCount)}
          valueClass="text-warning"
          delay={375}
        />
      </div>

      {/* Section B: AI Business Recap */}
      <div
        className="group relative bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        style={{ animationDelay: "400ms", animationFillMode: "both" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
        <div className="relative flex flex-col gap-4 min-h-[120px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="relative text-lg" aria-hidden>
                🦊
                {insightLoading ? (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
                ) : null}
              </span>
              <span className="text-sm font-semibold text-foreground">AEON Insight</span>
              <button
                type="button"
                onClick={() => void refreshInsight()}
                className="text-xs text-muted-foreground hover:text-accent transition-colors ml-2"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{insight.insight}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{insight.source === "ai" ? "AI-generated" : "Computed summary"}</span>
            <span>Refreshed {minutesAgo === 0 ? "just now" : `${minutesAgo} min ago`}</span>
          </div>
        </div>
      </div>

      {/* Section C: Priority + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "450ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Priority Actions</h2>
            <Badge tone={priorityActions.length > 0 ? "warning" : "success"}>{priorityActions.length}</Badge>
          </div>
          {priorityActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              🎯 No priority actions right now. Business is healthy.
            </p>
          ) : (
            <div className="space-y-1">
              {priorityActions.map((action, index) => {
                const style = SEVERITY_STYLES[action.severity];
                return (
                  <Link
                    key={`${action.href}-${index}`}
                    href={action.href}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-all duration-200"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${style.icon}`}>
                      <Target size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{boldActionText(action.text)}</p>
                    </div>
                    <Badge tone={style.badge}>{action.severity}</Badge>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-accent shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
          <h2 className="text-sm font-semibold text-foreground mb-2">Quick Actions</h2>
          <button
            type="button"
            disabled={emailBusy}
            onClick={() => void sendFollowUpEmail()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition text-left text-sm"
          >
            <Mail size={16} className="text-accent shrink-0" />
            <span>{emailConfirm ? "Confirm: create follow-up draft?" : "Send follow-up to Qualified leads"}</span>
          </button>
          <Link href="/sales/reports" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition text-sm">
            <BarChart3 size={16} className="text-accent shrink-0" />
            Generate weekly report
          </Link>
          <Link href="/crm/activities" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition text-sm">
            <Phone size={16} className="text-accent shrink-0" />
            Log a call
          </Link>
          <Link href="/crm/leads?new=1" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition text-sm">
            <Plus size={16} className="text-accent shrink-0" />
            Add a lead
          </Link>
          <Link href="/intelligence/chat" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition text-sm">
            <Sparkles size={16} className="text-accent shrink-0" />
            Ask AEON
          </Link>
        </div>
      </div>

      {/* Section D: Charts */}
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "550ms", animationFillMode: "both" }}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Revenue &amp; Pipeline Trend</h2>
            <p className="text-xs text-muted-foreground mt-1">Last 8 weeks</p>
          </div>
          <RevenueAreaChart data={chartData} valueKey="revenue" targetKey="pipeline" />
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pipeline Stages</h2>
            <p className="text-xs text-muted-foreground mt-1">Deal count by stage</p>
          </div>
          <div className="space-y-4">
            {pipelineStages.items.map((item, index) => {
              const pct = stageTotal > 0 ? Math.round((item.count / stageTotal) * 100) : 0;
              return (
                <div key={item.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-foreground">{item.stage}</span>
                    <span className="text-muted-foreground">
                      {item.count} · {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} color={item.color} delay={index * 80} />
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground pt-2 border-t border-border">
            Total Pipeline Value{" "}
            <span className="font-semibold text-foreground">{formatPipelineTotal(pipelineStages.totalValueCents)}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "650ms", animationFillMode: "both" }}>
        <h2 className="text-sm font-semibold text-foreground">Team Activity — Last 30 Days</h2>
        <div className="grid grid-cols-7 gap-1.5 max-w-2xl">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[10px] text-muted-foreground pb-1">
              {d}
            </div>
          ))}
          {heatmapCells.map((count, i) => {
            const opacity = count === 0 ? 10 : Math.max(10, Math.min(80, Math.round((count / heatmapMax) * 80)));
            return (
              <div
                key={i}
                title={`${count} activities`}
                className="aspect-square rounded-sm bg-accent transition-colors"
                style={{ opacity: opacity / 100 }}
              />
            );
          })}
        </div>
      </div>

      {/* Section E: Bottom row */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Deals</h2>
            <Link href="/crm/deals" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {recentDeals.map((deal, index) => (
              <Row key={deal.id} delay={index * 50}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={initials(deal.title)} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{deal.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {deal.contact_name ?? "No contact"} · {deal.owner_name ?? "Unassigned"}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-foreground">{money(deal.value_cents)}</div>
                  <Badge tone={stageTone(deal.stage)}>{deal.stage}</Badge>
                </div>
              </Row>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Leads</h2>
            <Link href="/crm/leads" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {recentLeads.map((lead, index) => (
              <Row key={lead.id} delay={index * 50}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={initials(lead.name)} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{lead.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.company ?? "No company"}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge tone={stageTone(lead.status)}>{lead.status}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{timeAgo(lead.created_at)}</div>
                </div>
              </Row>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Integration Status</h2>
          <div className="space-y-2">
            {integrations.map((item) => {
              const row = (
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-secondary/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0" aria-hidden>
                      {item.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.connected ? item.detail : "Not connected"}</div>
                    </div>
                  </div>
                  <Badge tone={item.connected ? "success" : "muted"}>
                    {item.connected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
              );
              if (!item.connected && item.href) {
                return (
                  <button
                    key={item.name}
                    type="button"
                    className="w-full text-left"
                    onClick={() => router.push(item.href!)}
                  >
                    {row}
                  </button>
                );
              }
              return <div key={item.name}>{row}</div>;
            })}
          </div>
        </div>
      </div>
    </PageSection>
  );
}