"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Eye,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { PageSection, SelectInput, TextArea, TextInput } from "@/components/pages/common";
import { Avatar, Badge, ProgressBar } from "@/components/ui/primitives";
import { CallButton } from "@/components/pages/dialer-client";
import type { LeadPoolStats, LeadWithActivities, NamedLead } from "@/lib/data/leads";
import type { LeadActivity } from "@/types/models";
import { fmtUSD } from "@/lib/db/money";
import { initials, stageTone, timeAgo } from "@/lib/ui/format";

type Filter = "all" | "hot" | "warm" | "cold" | "new_today" | "no_contact" | "my";
type Sort = "score" | "name" | "created_at" | "last_contacted_at";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All Leads" },
  { id: "hot", label: "🔥 Hot" },
  { id: "warm", label: "🟡 Warm" },
  { id: "cold", label: "❄️ Cold" },
  { id: "new_today", label: "New Today" },
  { id: "no_contact", label: "No Contact" },
  { id: "my", label: "My Leads" },
];

type LeadFormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  campaign: string;
  status: string;
  owner_id: string;
  budget_range: string;
  pain_points: string;
  decision_timeline: string;
  tags: string;
  notes: string;
};

const SOURCES = [
  "Inbound",
  "Google Ads",
  "Facebook Ads",
  "Referral",
  "Cold Outreach",
  "Event",
  "Other",
];

function tierEmoji(tier: string) {
  if (tier === "hot") return "🔥";
  if (tier === "warm") return "🟡";
  return "❄️";
}

function tierAvatarClass(tier: string) {
  if (tier === "hot") return "bg-destructive/15 text-destructive";
  if (tier === "warm") return "bg-warning/15 text-warning";
  return "bg-accent/15 text-accent";
}

function scoreBarColor(score: number) {
  if (score >= 70) return "bg-destructive";
  if (score >= 40) return "bg-warning";
  return "bg-accent";
}

function scoreRingColor(tier: string) {
  if (tier === "hot") return "oklch(var(--destructive) / 1)";
  if (tier === "warm") return "oklch(var(--warning) / 1)";
  return "oklch(var(--accent) / 1)";
}

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} stroke="oklch(var(--chart-grid) / 1)" strokeWidth="4" fill="none" />
      <circle
        cx="44"
        cy="44"
        r={r}
        stroke={scoreRingColor(tier)}
        strokeWidth="4"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">
        {score}
      </text>
    </svg>
  );
}

function SlideOver({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-[480px] bg-sidebar border-l border-sidebar-border shadow-2xl transform transition-transform duration-300 ease-out translate-x-0 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

function StatCard({
  label,
  subtext,
  value,
  valueClass,
  delay,
}: {
  label: string;
  subtext?: string;
  value: string;
  valueClass: string;
  delay: number;
}) {
  return (
    <div
      className="group relative bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {subtext ? <p className="text-xs text-muted-foreground/80 mt-0.5 mb-2">{subtext}</p> : <div className="mb-2" />}
        <span className={`text-2xl lg:text-3xl font-bold tracking-tight ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

export function LeadsClient({
  stats: initialStats,
  users,
  currentUserId,
}: {
  stats: LeadPoolStats;
  users: { id: string; name: string | null; email: string }[];
  currentUserId: string | null;
}) {
  const searchParams = useSearchParams();

  const [stats, setStats] = useState(initialStats);
  const [poolInsight, setPoolInsight] = useState("");
  const [poolInsightSource, setPoolInsightSource] = useState<"ai" | "computed">("computed");
  const [insightLoading, setInsightLoading] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("score");
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<NamedLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadWithActivities | null>(null);
  const [detailInsight, setDetailInsight] = useState("");
  const [scoreExplanation, setScoreExplanation] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [activityForm, setActivityForm] = useState({
    kind: "call",
    subject: "",
    body: "",
    sentiment: "neutral",
    duration_minutes: "",
  });

  const emptyForm = {
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Inbound",
    campaign: "",
    status: "new",
    owner_id: currentUserId ?? users[0]?.id ?? "",
    budget_range: "",
    pain_points: "",
    decision_timeline: "",
    tags: "",
    notes: "",
  };
  const [newForm, setNewForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      filter,
      sort,
      page: String(page),
    });
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/crm/leads?${params}`);
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    }
  }, [filter, search, sort, page]);

  const fetchPoolInsight = useCallback(async () => {
    setInsightLoading(true);
    const res = await fetch("/api/crm/leads/insights");
    const data = await res.json();
    setInsightLoading(false);
    if (res.ok) {
      setPoolInsight(data.insight ?? "");
      setPoolInsightSource(data.source ?? "computed");
    }
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setEditMode(false);
    const [leadRes, insightRes] = await Promise.all([
      fetch(`/api/crm/leads/${id}`),
      fetch(`/api/crm/leads/${id}/insight`),
    ]);
    if (leadRes.ok) {
      const lead = (await leadRes.json()) as LeadWithActivities;
      setDetail(lead);
      setEditForm({
        name: lead.name,
        company: lead.company ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        source: lead.source ?? "Inbound",
        campaign: lead.campaign ?? "",
        status: lead.status,
        owner_id: lead.owner_id ?? "",
        budget_range: lead.budget_range ?? "",
        pain_points: lead.pain_points ?? "",
        decision_timeline: lead.decision_timeline ?? "",
        tags: (lead.tags ?? []).join(", "),
        notes: lead.notes ?? "",
      });
    }
    if (insightRes.ok) {
      const ins = await insightRes.json();
      setDetailInsight(ins.insight ?? "");
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    void fetchPoolInsight();
  }, [fetchPoolInsight]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNew(true);
  }, [searchParams]);

  async function submitNewLead() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create lead");
      return;
    }
    setShowNew(false);
    setNewForm(emptyForm);
    setPage(1);
    await fetchLeads();
    await fetchPoolInsight();
    setStats((s) => ({ ...s, total: s.total + 1 }));
  }

  async function saveDetail() {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch(`/api/crm/leads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      const updated = (await res.json()) as LeadWithActivities;
      setDetail(updated);
      setEditMode(false);
      await fetchLeads();
    }
  }

  async function saveNotes(notes: string) {
    if (!selectedId) return;
    await fetch(`/api/crm/leads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    }
    await fetchLeads();
    await fetchPoolInsight();
  }

  async function logActivity() {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch(`/api/crm/leads/${selectedId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityForm),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setScoreExplanation(data.score?.explanation ?? "");
      setActivityForm({ kind: "call", subject: "", body: "", sentiment: "neutral", duration_minutes: "" });
      await openDetail(selectedId);
      await fetchLeads();
    }
  }

  const staleIds = useMemo(
    () =>
      new Set(
        leads
          .filter((l) => !l.last_contacted_at || Date.now() - new Date(l.last_contacted_at).getTime() > 7 * 86_400_000)
          .map((l) => l.id),
      ),
    [leads],
  );

  const responseRate = detail ? responseRateFromActivities(detail.activities) : 0;
  const daysSinceContact = detail?.last_contacted_at
    ? Math.floor((Date.now() - new Date(detail.last_contacted_at).getTime()) / 86_400_000)
    : null;

  return (
    <PageSection>
      {/* Intelligence bar */}
      <div className="group relative bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg relative">
              🦊
              {insightLoading ? <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" /> : null}
            </span>
            <span className="text-sm font-semibold text-foreground">AEON Lead Intelligence</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchPoolInsight()}
            className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-secondary transition"
            aria-label="Refresh insight"
          >
            <RefreshCw size={16} className={insightLoading ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          {poolInsight || "Loading lead intelligence…"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground capitalize">{poolInsightSource === "ai" ? "AI-generated" : "Computed summary"}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Leads" value={String(stats.total)} valueClass="text-foreground" delay={0} />
        <StatCard label="Hot Leads" subtext="score > 70" value={String(stats.hot)} valueClass="text-accent" delay={75} />
        <StatCard label="Stale Leads" subtext="no contact in 7d" value={String(stats.stale)} valueClass="text-warning" delay={150} />
        <StatCard
          label="Revenue Potential"
          value={fmtUSD(stats.revenuePotentialCents)}
          valueClass="text-success"
          delay={225}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setFilter(chip.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                filter === chip.id
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, company, email…"
            className="w-56"
          />
          <SelectInput value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
            <option value="score">Score</option>
            <option value="name">Name</option>
            <option value="created_at">Date Added</option>
            <option value="last_contacted_at">Last Contacted</option>
          </SelectInput>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent/40 bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Last Contact</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Loading leads…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No leads match your filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isHot = lead.score >= 70;
                  const isStale = staleIds.has(lead.id);
                  const lastContact = lead.last_contacted_at
                    ? timeAgo(lead.last_contacted_at)
                    : "Never";
                  const lastStale = !lead.last_contacted_at || Date.now() - new Date(lead.last_contacted_at).getTime() > 7 * 86_400_000;
                  const tags = lead.tags ?? [];

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => void openDetail(lead.id)}
                      className={`group border-t border-border cursor-pointer transition hover:bg-secondary/50 ${
                        isHot ? "border-l-2 border-l-accent" : ""
                      } ${isStale ? "bg-warning/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${tierAvatarClass(lead.score_tier)}`}>
                            {initials(lead.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{lead.name}</div>
                            <div className="text-xs text-muted-foreground">{lead.company ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">{lead.score}</span>
                          <span>{tierEmoji(lead.score_tier)}</span>
                        </div>
                        <ProgressBar value={lead.score} color={scoreBarColor(lead.score)} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={stageTone(lead.status)}>{lead.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.source ?? lead.campaign ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-secondary text-xs">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 ? (
                            <span className="text-xs text-muted-foreground">+{tags.length - 3} more</span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${lastStale ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {lastContact}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={initials(lead.owner_name)} />
                          <span className="text-xs">{lead.owner_name ?? "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          <ActionIcon onClick={() => void openDetail(lead.id)} icon={<Eye size={14} />} />
                          <ActionIcon onClick={() => void openDetail(lead.id)} icon={<Pencil size={14} />} />
                          <ActionIcon
                            onClick={() => {
                              void openDetail(lead.id);
                              setActivityForm((f) => ({ ...f, kind: "call" }));
                            }}
                            icon={<Phone size={14} />}
                          />
                          <ActionIcon
                            onClick={() => {
                              void openDetail(lead.id);
                              setActivityForm((f) => ({ ...f, kind: "email" }));
                            }}
                            icon={<Mail size={14} />}
                          />
                          <ActionIcon onClick={() => void deleteLead(lead.id)} icon={<Trash2 size={14} />} danger />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} leads
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary"
            >
              <ArrowLeft size={14} /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <SlideOver open={Boolean(selectedId && detail)} onClose={() => { setSelectedId(null); setDetail(null); }}>
        {detail ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <ScoreRing score={detail.score} tier={detail.score_tier} />
              <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="p-2 rounded-lg hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
              <p className="text-sm text-muted-foreground">{detail.company ?? "No company"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge tone={stageTone(detail.status)}>{detail.status}</Badge>
                <span className="text-sm">
                  {tierEmoji(detail.score_tier)} {detail.score_tier}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {(["call", "email", "note", "meeting"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setActivityForm((f) => ({ ...f, kind }))}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary capitalize"
                  >
                    {kind === "call" ? "📞 Call" : kind === "email" ? "✉️ Email" : kind === "note" ? "📝 Note" : "🗓️ Meeting"}
                  </button>
                ))}
              </div>
              {detail.phone && (
                <div className="mt-3">
                  <CallButton leadId={detail.id} toNumber={detail.phone} size="md" />
                </div>
              )}
            </div>

            <details className="rounded-xl border border-border p-4" open>
              <summary className="text-sm font-semibold cursor-pointer">Score Breakdown</summary>
              <div className="mt-3 space-y-2 text-sm">
                <MetricRow
                  label="Last Contacted"
                  value={daysSinceContact === null ? "Never" : `${daysSinceContact} days ago`}
                  warn={daysSinceContact === null || daysSinceContact > 7}
                />
                <MetricRow label="Activity Count" value={String(detail.activities.length)} />
                <MetricRow label="Response Rate" value={`${responseRate}%`} />
                <MetricRow label="Sentiment" value={`${sentimentEmoji(detail.sentiment)} ${detail.sentiment}`} />
                {scoreExplanation ? (
                  <p className="text-xs text-muted-foreground pt-2">{scoreExplanation}</p>
                ) : null}
              </div>
            </details>

            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-semibold text-accent mb-2">Lead Intelligence</p>
              <p className="text-sm text-foreground">{detailInsight}</p>
            </div>

            <details className="rounded-xl border border-border p-4">
              <summary className="text-sm font-semibold cursor-pointer flex items-center justify-between">
                Profile Details
                <button
                  type="button"
                  className="text-xs text-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditMode((v) => !v);
                  }}
                >
                  {editMode ? "Cancel" : "Edit"}
                </button>
              </summary>
              {editMode ? (
                <ProfileForm form={editForm} setForm={setEditForm} users={users} onSave={() => void saveDetail()} saving={saving} />
              ) : (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Email: {detail.email ?? "—"}</p>
                  <p>Phone: {detail.phone ?? "—"}</p>
                  <p>Source: {detail.source ?? "—"}</p>
                  <p>Campaign: {detail.campaign ?? "—"}</p>
                  <p>Budget: {detail.budget_range ?? "—"}</p>
                  <p>Pain points: {detail.pain_points ?? "—"}</p>
                  <p>Timeline: {detail.decision_timeline ?? "—"}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(detail.tags ?? []).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-secondary text-xs text-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <TextArea
                className="mt-4"
                value={detail.notes ?? ""}
                onChange={(e) => setDetail({ ...detail, notes: e.target.value })}
                onBlur={(e) => void saveNotes(e.target.value)}
                placeholder="Notes…"
              />
            </details>

            <div>
              <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
              {detail.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No activity logged yet. Log the first interaction.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.activities.map((act) => (
                    <ActivityItem key={act.id} activity={act} />
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Add Activity</p>
                <SelectInput value={activityForm.kind} onChange={(e) => setActivityForm({ ...activityForm, kind: e.target.value })}>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="note">Note</option>
                  <option value="meeting">Meeting</option>
                </SelectInput>
                <TextInput
                  placeholder="Subject"
                  value={activityForm.subject}
                  onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                />
                <TextArea
                  placeholder="Body"
                  value={activityForm.body}
                  onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })}
                />
                {(activityForm.kind === "call" || activityForm.kind === "email") && (
                  <div className="flex gap-2 flex-wrap">
                    {(["positive", "neutral", "negative"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setActivityForm({ ...activityForm, sentiment: s })}
                        className={`px-2 py-1 rounded-lg text-xs border ${
                          activityForm.sentiment === s ? "border-accent bg-accent/10" : "border-border"
                        }`}
                      >
                        {s === "positive" ? "😊 Positive" : s === "negative" ? "😠 Negative" : "😐 Neutral"}
                      </button>
                    ))}
                  </div>
                )}
                {activityForm.kind === "call" && (
                  <TextInput
                    type="number"
                    placeholder="Duration (minutes)"
                    value={activityForm.duration_minutes}
                    onChange={(e) => setActivityForm({ ...activityForm, duration_minutes: e.target.value })}
                  />
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void logActivity()}
                  className="w-full h-9 rounded-lg bg-accent text-accent-foreground text-sm font-medium"
                >
                  {saving ? "Saving…" : "Log Activity"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SlideOver>

      {/* New lead panel */}
      <SlideOver open={showNew} onClose={() => setShowNew(false)}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Lead</h2>
            <button type="button" onClick={() => setShowNew(false)} className="p-2 rounded-lg hover:bg-secondary">
              <X size={18} />
            </button>
          </div>
          <ProfileForm form={newForm} setForm={setNewForm} users={users} onSave={() => void submitNewLead()} saving={saving} isNew />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </SlideOver>
    </PageSection>
  );
}

function responseRateFromActivities(activities: LeadActivity[]): number {
  if (!activities.length) return 0;
  const positive = activities.filter((a) => a.sentiment === "positive").length;
  return Math.round((positive / activities.length) * 100);
}

function ActionIcon({ onClick, icon, danger }: { onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary ${
        danger ? "hover:text-destructive hover:border-destructive/40" : ""
      }`}
    >
      {icon}
    </button>
  );
}

function MetricRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? "text-warning font-medium" : "text-foreground"}>{value}</span>
    </div>
  );
}

function sentimentEmoji(s: string) {
  if (s === "positive") return "😊";
  if (s === "negative") return "😠";
  return "😐";
}

function ActivityItem({ activity }: { activity: LeadWithActivities["activities"][0] }) {
  const iconMap = {
    call: { cls: "bg-accent/10 text-accent", Icon: Phone },
    email: { cls: "bg-success/10 text-success", Icon: Mail },
    note: { cls: "bg-warning/10 text-warning", Icon: FileText },
    meeting: { cls: "bg-chart-4/10 text-chart-4", Icon: Calendar },
    task: { cls: "bg-secondary text-muted-foreground", Icon: FileText },
  };
  const meta = iconMap[activity.kind as keyof typeof iconMap] ?? iconMap.note;
  const Icon = meta.Icon;
  return (
    <div className="flex gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{activity.subject ?? activity.kind}</div>
        {activity.body ? <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activity.body}</p> : null}
        <div className="text-xs text-muted-foreground mt-1">
          {activity.user_name ?? "System"} · {timeAgo(activity.occurred_at)}
          {(activity.kind === "call" || activity.kind === "email") && activity.sentiment ? (
            <span className="ml-2">{sentimentEmoji(activity.sentiment)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileForm({
  form,
  setForm,
  users,
  onSave,
  saving,
  isNew,
}: {
  form: LeadFormState;
  setForm: React.Dispatch<React.SetStateAction<LeadFormState>>;
  users: { id: string; name: string | null; email: string }[];
  onSave: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="space-y-3 mt-3">
      <TextInput placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <TextInput placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      <TextInput placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextInput placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <SelectInput value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </SelectInput>
      <TextInput placeholder="Campaign" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
      <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="new">new</option>
        <option value="contacted">contacted</option>
        <option value="qualified">qualified</option>
        <option value="disqualified">disqualified</option>
      </SelectInput>
      <SelectInput value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name ?? u.email}
          </option>
        ))}
      </SelectInput>
      <TextInput placeholder="Budget range" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} />
      <TextArea placeholder="Pain points" value={form.pain_points} onChange={(e) => setForm({ ...form, pain_points: e.target.value })} />
      <TextInput placeholder="Decision timeline" value={form.decision_timeline} onChange={(e) => setForm({ ...form, decision_timeline: e.target.value })} />
      <TextInput placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      <TextArea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button
        type="button"
        disabled={saving || !form.name.trim()}
        onClick={onSave}
        className="w-full h-9 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : isNew ? "Create Lead" : "Save Changes"}
      </button>
    </div>
  );
}