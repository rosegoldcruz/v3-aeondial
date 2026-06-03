"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Circle, DollarSign, Eye, Mail, Pencil, Phone, Plus, Trophy, TrendingUp, X } from "lucide-react";
import { Avatar, Badge, EmptyState, ProgressBar, Stat } from "@/components/ui/primitives";
import {
  ActionButton,
  GhostButton,
  PageSection,
  SelectInput,
  StatGrid,
  TextArea,
  TextInput,
  ToneBadge,
  statusTone,
} from "@/components/pages/common";
import { formatDate, formatShortDate, initials, money, timeAgo } from "@/lib/ui/format";
import type { DealActivityRow, DealDetail, DealRow } from "@/lib/data/crm";

const stages = ["lead", "qualified", "proposal", "negotiation", "won"] as const;
const stageColors: Record<(typeof stages)[number], string> = {
  lead: "border-chart-1",
  qualified: "border-chart-2",
  proposal: "border-chart-3",
  negotiation: "border-chart-4",
  won: "border-success",
};
const stageLabels: Record<(typeof stages)[number], string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
};
const activityKinds = ["call", "email", "note", "meeting"] as const;
const sentimentKinds = ["positive", "neutral", "negative"] as const;

export function CRMPipelineClient({ deals }: { deals: DealRow[] }) {
  const [rows, setRows] = useState(deals);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [forecast, setForecast] = useState<{ monthlyTarget: number; projected: number; gap: number; closeRate: number; neededQualified: number; openPipeline: number; wonThisMonth: number } | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [insightSource, setInsightSource] = useState<"ai" | "computed">("computed");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activityForm, setActivityForm] = useState({ kind: "call" as (typeof activityKinds)[number], subject: "", body: "", sentiment: "neutral", duration_minutes: "" });
  const [detailForm, setDetailForm] = useState({
    stage: "lead",
    value_cents: "0",
    probability: "20",
    expected_close: "",
    next_action: "",
    competitor: "",
    notes: "",
  });

  useEffect(() => {
    void loadForecast();
    void loadInsight();
  }, [rows]);

  useEffect(() => {
    if (!detail) return;
    setDetailForm({
      stage: detail.stage,
      value_cents: String(Math.round(detail.value_cents / 100)),
      probability: String(detail.probability ?? 20),
      expected_close: detail.expected_close ?? "",
      next_action: detail.next_action ?? "",
      competitor: detail.competitor ?? "",
      notes: detail.notes ?? "",
    });
  }, [detail]);

  const grouped = useMemo(() => {
    const map = new Map<string, DealRow[]>();
    for (const stage of stages) map.set(stage, []);
    for (const deal of rows.filter((row) => !["lost"].includes(row.stage))) {
      map.get(deal.stage)?.push(deal);
    }
    return map;
  }, [rows]);

  const activeDeals = rows.filter((deal) => !["won", "lost"].includes(deal.stage));
  const wonDeals = rows.filter((deal) => deal.stage === "won");
  const monthlyProgress = activeDeals.reduce((sum, deal) => sum + (deal.stage === "won" ? deal.value_cents : 0), 0) + wonDeals.filter((deal) => isThisMonth(deal.updated_at)).reduce((sum, deal) => sum + deal.value_cents, 0);
  const monthlyTarget = 25000000;
  const targetPct = Math.min(100, Math.round((monthlyProgress / monthlyTarget) * 100));

  async function openDetail(dealId: string) {
    setSelectedId(dealId);
    setLoadingDetail(true);
    setError("");
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load deal");
      setDetail(data as DealDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deal");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadForecast() {
    const res = await fetch("/api/crm/pipeline/forecast").catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => null);
    if (res.ok && data) setForecast(data);
  }

  async function loadInsight() {
    const res = await fetch("/api/crm/pipeline/insights").catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setInsight(data.insight ?? "");
      setInsightSource(data.source ?? "computed");
    }
  }

  async function saveDetail(patch: Record<string, unknown>) {
    if (!detail) return;
    setSaving(true);
    const res = await fetch(`/api/crm/deals/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to update deal");
      return;
    }
    setDetail(data as DealDetail);
    setRows((current) => current.map((deal) => (deal.id === data.id ? { ...deal, ...data } : deal)));
  }

  async function submitActivity() {
    if (!detail) return;
    setSaving(true);
    const res = await fetch(`/api/crm/deals/${detail.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...activityForm,
        duration_seconds: activityForm.kind === "call" && activityForm.duration_minutes ? Number(activityForm.duration_minutes) * 60 : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to log activity");
      return;
    }
    await openDetail(detail.id);
    setActivityForm({ kind: "call", subject: "", body: "", sentiment: "neutral", duration_minutes: "" });
  }

  async function moveToNext() {
    if (!detail) return;
    const next = nextStage(detail.stage);
    if (!next) return;
    await saveDetail({ stage: next });
    await openDetail(detail.id);
  }

  async function submitStageChange() {
    if (!detail) return;
    await saveDetail({
      stage: detailForm.stage,
      value_cents: Number(detailForm.value_cents || 0) * 100,
      probability: Number(detailForm.probability || 0),
      expected_close: detailForm.expected_close || null,
      next_action: detailForm.next_action || null,
      competitor: detailForm.competitor || null,
      notes: detailForm.notes || null,
    });
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Open Pipeline" value={money(activeDeals.reduce((sum, deal) => sum + deal.value_cents, 0))} />
        <Stat label="Won This Month" value={money(wonDeals.filter((deal) => isThisMonth(deal.updated_at)).reduce((sum, deal) => sum + deal.value_cents, 0))} tone="up" />
        <Stat label="Avg Probability" value={`${Math.round(activeDeals.reduce((sum, deal) => sum + deal.probability, 0) / Math.max(1, activeDeals.length))}%`} />
        <Stat label="Closed Deals" value={String(wonDeals.length)} />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-5">
        {stages.map((stage) => {
          const stageDeals = grouped.get(stage) ?? [];
          const stageTotal = stageDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
          return (
            <div key={stage} className={`rounded-xl border border-border bg-card p-4 ${stageColors[stage]}`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{stageLabels[stage]}</div>
                  <div className="text-xs text-muted-foreground">{stageDeals.length} deals · {money(stageTotal)}</div>
                </div>
                <Badge tone={statusTone(stage)}>{stageDeals.length}</Badge>
              </div>
              <div className="space-y-3">
                {stageDeals.length ? stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} onOpen={() => void openDetail(deal.id)} />) : <EmptyState title="No deals" hint="Drop a deal here to keep the pipeline moving." />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr,1fr]">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Monthly Progress</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Monthly Target: $250,000</div>
            <ProgressBar value={targetPct} color="bg-success" />
            <div className="text-sm text-muted-foreground">You&apos;re at {money(monthlyProgress)} — {money(Math.max(0, monthlyTarget - monthlyProgress))} to go</div>
            <div className="text-xs font-medium text-foreground">{targetPct}% to target</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Trophy size={16} />Leaderboard</div>
            {leaderboard(rows).slice(0, 3).map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <div className="flex items-center gap-3">
                  <RankBadge rank={index + 1} />
                  <div>
                    <div className="text-sm font-medium text-foreground">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.closed} deals closed</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-accent">{money(entry.revenue)}</div>
              </div>
            ))}
            <a href="/sales/team" className="text-xs font-medium text-accent hover:underline">View full leaderboard</a>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Trophy size={16} />Achievements</div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">🏆 First Deal Won!</Badge>
              <Badge tone="success">🔥 3 deals closed this week</Badge>
              <Badge tone="warning">💰 Biggest deal: $245K GlobalFin</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Pipeline Health</div>
            <div className="text-sm leading-6 text-foreground">{insight || fallbackInsight(rows)}</div>
            <div className="text-xs text-muted-foreground">{insightSource === "ai" ? "DeepSeek insight" : "Computed fallback"}</div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Forecasting</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Projected this month: {money(forecast?.projected ?? 0)}</div>
              <div>With pipeline close rate ({forecast?.closeRate ?? 0}%): +{money(Math.round((forecast?.openPipeline ?? 0) * ((forecast?.closeRate ?? 0) / 100)))}</div>
              <div>To hit $250K target: need {forecast?.neededQualified ?? 0} more qualified deals</div>
            </div>
            <ProgressBar value={Math.min(100, Math.round(((forecast?.projected ?? 0) / monthlyTarget) * 100))} color="bg-chart-2" />
          </div>
        </div>
      </div>

      <SlideOver open={Boolean(selectedId)} onClose={() => { setSelectedId(null); setDetail(null); }}>
        {loadingDetail ? (
          <div className="p-6 text-sm text-muted-foreground">Loading deal...</div>
        ) : detail ? (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border bg-gradient-to-br from-chart-4/15 via-secondary/20 to-transparent p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold text-foreground">{detail.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(detail.stage)}>{detail.stage}</Badge>
                    <Badge tone={probabilityTone(detail.probability)}>{detail.probability}% probability</Badge>
                  </div>
                  <div className="mt-3 text-3xl font-bold text-accent">{money(detail.value_cents)}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar initials={initials(detail.owner_name ?? detail.title)} />
                    <span>{detail.owner_name ?? "Open queue"}</span>
                    {detail.expected_close ? <span>· closes {formatDate(detail.expected_close)}</span> : null}
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="rounded-lg p-2 hover:bg-secondary"><X size={18} /></button>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Deal Insight</div>
                <div className="mt-2 text-sm leading-6 text-foreground">{detail.ai_insight || detail.computed_insight}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <details open className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Deal Details</summary>
                <div className="mt-4 grid gap-3">
                  <SelectInput value={detailForm.stage} onChange={(event) => setDetailForm({ ...detailForm, stage: event.target.value })}>
                    {stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}
                  </SelectInput>
                  <TextInput type="number" placeholder="Value ($)" value={detailForm.value_cents} onChange={(event) => setDetailForm({ ...detailForm, value_cents: event.target.value })} />
                  <input type="range" min="0" max="100" value={detailForm.probability} onChange={(event) => setDetailForm({ ...detailForm, probability: event.target.value })} className="w-full" />
                  <TextInput type="date" value={detailForm.expected_close} onChange={(event) => setDetailForm({ ...detailForm, expected_close: event.target.value })} />
                  <TextInput placeholder="Next action" value={detailForm.next_action} onChange={(event) => setDetailForm({ ...detailForm, next_action: event.target.value })} />
                  <TextInput placeholder="Competitor" value={detailForm.competitor} onChange={(event) => setDetailForm({ ...detailForm, competitor: event.target.value })} />
                  <TextArea placeholder="Notes" value={detailForm.notes} onChange={(event) => setDetailForm({ ...detailForm, notes: event.target.value })} />
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>Contact: {detail.contact_name ?? "Unassigned"} {detail.contact_company ? `· ${detail.contact_company}` : ""}</div>
                    <div>Stage age: {detail.days_in_stage} days</div>
                  </div>
                  <div className="flex gap-3">
                    <ActionButton onClick={() => void submitStageChange()} disabled={saving}>{saving ? "Saving..." : "Save Deal"}</ActionButton>
                    <GhostButton onClick={() => void moveToNext()}>Move to {nextStage(detail.stage) ?? detail.stage} →</GhostButton>
                  </div>
                </div>
              </details>

              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Move History</summary>
                <div className="mt-4 space-y-3">
                  {(detail.activities ?? []).filter((activity) => activity.subject?.startsWith("Moved to")).length ? (detail.activities ?? []).filter((activity) => activity.subject?.startsWith("Moved to")).map((activity) => <DealTimelineRow key={activity.id} activity={activity} />) : <EmptyState title="No stage moves yet." />}
                </div>
              </details>

              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Activity Log</summary>
                <div className="mt-4 space-y-3">
                  {detail.activities.length ? detail.activities.map((activity) => <DealTimelineRow key={activity.id} activity={activity} />) : <EmptyState title="No activity logged yet." />}
                </div>
                <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Activity</div>
                  <SelectInput value={activityForm.kind} onChange={(event) => setActivityForm({ ...activityForm, kind: event.target.value as (typeof activityKinds)[number] })}>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="note">Note</option>
                    <option value="meeting">Meeting</option>
                  </SelectInput>
                  <TextInput placeholder="Subject" value={activityForm.subject} onChange={(event) => setActivityForm({ ...activityForm, subject: event.target.value })} />
                  <TextArea placeholder="Body" value={activityForm.body} onChange={(event) => setActivityForm({ ...activityForm, body: event.target.value })} />
                  {activityForm.kind === "call" || activityForm.kind === "email" ? (
                    <div className="flex flex-wrap gap-2">
                      {sentimentKinds.map((sentiment) => (
                        <button key={sentiment} type="button" onClick={() => setActivityForm({ ...activityForm, sentiment })} className={`rounded-lg border px-3 py-1.5 text-xs ${activityForm.sentiment === sentiment ? "border-accent bg-accent/10 text-accent" : "border-border"}`}>
                          {sentiment === "positive" ? "😊 Positive" : sentiment === "negative" ? "😠 Negative" : "😐 Neutral"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {activityForm.kind === "call" ? <TextInput type="number" placeholder="Duration (minutes)" value={activityForm.duration_minutes} onChange={(event) => setActivityForm({ ...activityForm, duration_minutes: event.target.value })} /> : null}
                  <ActionButton onClick={() => void submitActivity()} disabled={saving}>{saving ? "Saving..." : "Log Activity"}</ActionButton>
                </div>
              </details>
            </div>
          </div>
        ) : null}
      </SlideOver>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}
    </PageSection>
  );
}

function DealCard({ deal, onOpen }: { deal: DealRow; onOpen: () => void }) {
  const stuck = deal.days_in_stage > 14;
  return (
    <button type="button" onClick={onOpen} title={deal.days_in_stage > 7 ? "Nudge owner - deal is stalling" : undefined} className="group w-full rounded-xl border border-border bg-secondary/30 p-3 text-left transition hover:bg-secondary/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">{deal.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{deal.contact_name ?? "No contact linked"}{deal.contact_company ? ` · ${deal.contact_company}` : ""}</div>
        </div>
        <Badge tone={probabilityTone(deal.probability)}>{deal.probability}%</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{money(deal.value_cents)}</span>
        <span className={stuck ? "rounded-full bg-destructive/10 px-2 py-0.5 text-destructive" : "rounded-full bg-secondary px-2 py-0.5"}>{deal.days_in_stage}d in stage</span>
      </div>
      {deal.next_action ? <div className="mt-2 text-xs text-muted-foreground">📅 {deal.next_action}</div> : null}
    </button>
  );
}

function DealTimelineRow({ activity }: { activity: DealActivityRow }) {
  const Icon = activity.kind === "call" ? Phone : activity.kind === "email" ? Mail : activity.kind === "meeting" ? CalendarDays : Pencil;
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"><Icon size={14} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{activity.subject ?? activity.kind}</div>
        {activity.body ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activity.body}</div> : null}
        <div className="mt-1 text-xs text-muted-foreground">{activity.user_name ?? "System"} · {timeAgo(activity.occurred_at)} {activity.sentiment && (activity.kind === "call" || activity.kind === "email") ? <span className="ml-2">{sentimentEmoji(activity.sentiment)}</span> : null}</div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const tone = rank === 1 ? "bg-yellow-500/15 text-yellow-500" : rank === 2 ? "bg-slate-400/15 text-slate-400" : "bg-orange-500/15 text-orange-500";
  return <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${tone}`}>#{rank}</div>;
}

function SlideOver({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <button type="button" aria-label="Close overlay" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-border bg-background shadow-2xl animate-in slide-in-from-right-8 duration-300">
        {children}
      </aside>
    </div>
  );
}

function leaderboard(rows: DealRow[]) {
  const map = new Map<string, { name: string; closed: number; revenue: number }>();
  for (const deal of rows.filter((row) => row.stage === "won")) {
    const key = deal.owner_name ?? "Unassigned";
    const entry = map.get(key) ?? { name: key, closed: 0, revenue: 0 };
    entry.closed += 1;
    entry.revenue += deal.value_cents;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function fallbackInsight(rows: DealRow[]) {
  const active = rows.filter((row) => !["won", "lost"].includes(row.stage));
  const stuck = active.filter((row) => row.days_in_stage > 7).sort((a, b) => b.days_in_stage - a.days_in_stage)[0];
  const proposal = active.filter((row) => row.stage === "proposal");
  return `Pipeline is ${money(active.reduce((sum, row) => sum + row.value_cents, 0))} across ${active.length} active deals${stuck ? ` with 1 stuck in ${stuck.stage} for ${stuck.days_in_stage} days` : ""}. Proposal stage has a ${proposal.length ? Math.max(1, Math.round((rows.filter((row) => row.stage === "won").length / proposal.length) * 100)) : 0}% win rate. ${stuck ? `Recommend nudging ${stuck.title} before ${stuck.expected_close ? formatShortDate(stuck.expected_close) : "the next close date"}.` : ""}`;
}

function probabilityTone(probability: number) {
  if (probability >= 70) return "success";
  if (probability >= 40) return "warning";
  return "muted";
}

function nextStage(stage: DealRow["stage"]) {
  if (stage === "lead") return "qualified";
  if (stage === "qualified") return "proposal";
  if (stage === "proposal") return "negotiation";
  if (stage === "negotiation") return "won";
  return null;
}

function sentimentEmoji(sentiment: string) {
  if (sentiment === "positive") return "😊";
  if (sentiment === "negative") return "😠";
  return "😐";
}

function isThisMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
