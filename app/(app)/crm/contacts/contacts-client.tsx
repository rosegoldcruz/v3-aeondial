"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Circle, Eye, Linkedin, Mail, MessageSquare, Pencil, Phone, Plus, Send, Trash2, Twitter, X } from "lucide-react";
import { Avatar, Badge, EmptyState, ProgressBar, Stat } from "@/components/ui/primitives";
import {
  ActionButton,
  GhostButton,
  PageSection,
  SelectInput,
  StatGrid,
  TableHeader,
  TableShell,
  Td,
  TextArea,
  TextInput,
  ToneBadge,
  Th,
  DataTable,
  statusTone,
} from "@/components/pages/common";
import { formatDate, initials, money, timeAgo } from "@/lib/ui/format";
import type { ContactActivityRow, ContactDetail, ContactRow } from "@/lib/data/crm";

const filterOptions = ["all", "healthy", "at_risk", "cold", "new_week", "vip"] as const;
const activityKinds = ["call", "email", "note", "meeting"] as const;
const sentimentKinds = ["positive", "neutral", "negative"] as const;

export function CRMContactsClient({ contacts }: { contacts: ContactRow[] }) {
  const [rows, setRows] = useState(contacts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newForm, setNewForm] = useState({
    name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    linkedin: "",
    twitter: "",
    referral_source: "",
    interests: "",
    notes: "",
    lifetime_value_cents: "0",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    email: "",
    phone: "",
    linkedin: "",
    twitter: "",
    birthday: "",
    referral_source: "",
    first_contact_date: "",
    lifetime_value_cents: "0",
    interests: "",
    notes: "",
    tags: "",
    owner_id: "",
  });
  const [activityForm, setActivityForm] = useState({ kind: "call" as (typeof activityKinds)[number], subject: "", body: "", sentiment: "neutral", duration_minutes: "" });

  useEffect(() => {
    if (!detail) return;
    setEditForm({
      title: detail.title ?? "",
      company: detail.company ?? "",
      email: detail.email ?? "",
      phone: detail.phone ?? "",
      linkedin: detail.linkedin ?? "",
      twitter: detail.twitter ?? "",
      birthday: detail.birthday ?? "",
      referral_source: detail.referral_source ?? "",
      first_contact_date: detail.first_contact_date ?? "",
      lifetime_value_cents: String(detail.lifetime_value_cents ?? 0),
      interests: detail.interests ?? "",
      notes: detail.notes ?? "",
      tags: (detail.tags ?? []).join(", "),
      owner_id: detail.owner_id ?? "",
    });
  }, [detail]);

  const filtered = useMemo(() => rows.filter((contact) => {
    const haystack = `${contact.name} ${contact.title ?? ""} ${contact.company ?? ""} ${contact.email ?? ""} ${contact.phone ?? ""} ${contact.tags?.join(" ") ?? ""}`.toLowerCase();
    if (!haystack.includes(query.toLowerCase())) return false;
    if (filter === "all") return true;
    if (filter === "new_week") return Date.now() - new Date(contact.created_at).getTime() < 7 * 86400000;
    if (filter === "vip") return contact.lifetime_value_cents >= 1000000;
    return contact.health_tier === filter;
  }), [rows, query, filter]);

  const stats = useMemo(() => ({
    total: rows.length,
    healthy: rows.filter((contact) => contact.health_tier === "healthy").length,
    atRisk: rows.filter((contact) => contact.health_tier === "at_risk").length,
    vip: rows.filter((contact) => contact.lifetime_value_cents >= 1000000).length,
  }), [rows]);

  async function openDetail(contactId: string, edit = false) {
    setSelectedId(contactId);
    setLoadingDetail(true);
    setError("");
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load contact");
      setDetail(data as ContactDetail);
      if (edit) {
        setActivityForm((current) => ({ ...current, kind: "call" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load contact");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function submitNew() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newForm,
        kind: "contact",
        lifetime_value_cents: Number(newForm.lifetime_value_cents || 0) * 100,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to save contact");
      return;
    }
    const created = data as ContactRow;
    setRows([created, ...rows]);
    setShowNew(false);
    setNewForm({
      name: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      linkedin: "",
      twitter: "",
      referral_source: "",
      interests: "",
      notes: "",
      lifetime_value_cents: "0",
    });
  }

  async function saveProfile() {
    if (!detail) return;
    setSaving(true);
    const res = await fetch(`/api/crm/contacts/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        lifetime_value_cents: Number(editForm.lifetime_value_cents || 0) * 100,
        tags: editForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to save contact");
      return;
    }
    setDetail(data as ContactDetail);
    setRows((current) => current.map((contact) => (contact.id === data.id ? { ...contact, ...data } : contact)));
  }

  async function saveNotes(value: string) {
    if (!detail) return;
    const res = await fetch(`/api/crm/contacts/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    const data = await res.json();
    if (res.ok) {
      setDetail(data as ContactDetail);
      setRows((current) => current.map((contact) => (contact.id === data.id ? { ...contact, ...data } : contact)));
    }
  }

  async function submitActivity() {
    if (!detail) return;
    setSaving(true);
    const res = await fetch(`/api/crm/contacts/${detail.id}/activities`, {
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
    setRows((current) => current.map((contact) => contact.id === detail.id ? { ...contact, last_activity_at: new Date().toISOString() } : contact));
    setActivityForm({ kind: "call", subject: "", body: "", sentiment: "neutral", duration_minutes: "" });
  }

  async function deleteContact(contactId: string) {
    const res = await fetch(`/api/crm/contacts/${contactId}`, { method: "DELETE" });
    if (res.ok) {
      setRows((current) => current.filter((contact) => contact.id !== contactId));
      if (selectedId === contactId) {
        setSelectedId(null);
        setDetail(null);
      }
    }
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Contacts" value={String(stats.total)} />
        <Stat label="Healthy" value={String(stats.healthy)} tone="up" />
        <Stat label="At Risk" value={String(stats.atRisk)} tone="down" />
        <Stat label="VIP" value={String(stats.vip)} />
      </StatGrid>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 lg:grid-cols-[1fr,220px,auto]">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts" />
        <SelectInput value={filter} onChange={(event) => setFilter(event.target.value as (typeof filterOptions)[number])}>
          <option value="all">All</option>
          <option value="healthy">Healthy</option>
          <option value="at_risk">At Risk</option>
          <option value="cold">Cold</option>
          <option value="new_week">New This Week</option>
          <option value="vip">VIP</option>
        </SelectInput>
        <ActionButton onClick={() => setShowNew(true)}><Plus size={16} className="mr-2" />New Contact</ActionButton>
      </div>

      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Contact</Th>
                <Th>Company</Th>
                <Th>Health</Th>
                <Th>Email + Phone</Th>
                <Th>Tags</Th>
                <Th>LTV</Th>
                <Th>Owner</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} className="group cursor-pointer border-t border-border hover:bg-secondary/30" onClick={() => void openDetail(contact.id)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(contact.name)} gradient />
                      <div>
                        <div className="font-medium text-foreground">{contact.name}</div>
                        <div className="text-xs text-muted-foreground">{contact.title ?? "No title"}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>{contact.company ?? "No company"}</Td>
                  <Td>
                    <div className="flex items-start gap-2">
                      <HealthDot tier={contact.health_tier} />
                      <div className="space-y-0.5 text-xs">
                        <div className="font-medium capitalize text-foreground">{formatTier(contact.health_tier)}</div>
                        <div className="text-muted-foreground">{contact.last_activity_at ? `last contact ${timeAgo(contact.last_activity_at)}` : "no contact yet"}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>{contact.email ?? "No email"}</div>
                      <div>{contact.phone ?? "No phone"}</div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex max-w-[240px] flex-wrap gap-1">
                      {(contact.tags ?? []).slice(0, 3).map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}
                      {(contact.tags ?? []).length > 3 ? <Badge tone="muted">+{contact.tags.length - 3}</Badge> : null}
                    </div>
                  </Td>
                  <Td>{money(contact.lifetime_value_cents)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar initials={initials(contact.owner_name ?? contact.name)} />
                      <span className="text-xs text-muted-foreground">{contact.owner_name ?? "Unassigned"}</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
                      <ActionButton className="px-3" onClick={() => void openDetail(contact.id)}>View</ActionButton>
                      <GhostButton onClick={() => void openDetail(contact.id, true)}><Pencil size={14} /></GhostButton>
                      <GhostButton onClick={() => void deleteContact(contact.id)}><Trash2 size={14} /></GhostButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>

      {!filtered.length ? <EmptyState title="No contacts match this filter." hint="Try a different search or create a new contact." /> : null}

      <SlideOver open={Boolean(selectedId || showNew)} onClose={() => { setSelectedId(null); setDetail(null); setShowNew(false); }}>
        {showNew ? (
          <div className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Contact</h2>
              <button type="button" onClick={() => setShowNew(false)} className="rounded-lg p-2 hover:bg-secondary"><X size={18} /></button>
            </div>
            <div className="grid gap-3">
              <TextInput placeholder="Name *" value={newForm.name} onChange={(event) => setNewForm({ ...newForm, name: event.target.value })} />
              <TextInput placeholder="Title" value={newForm.title} onChange={(event) => setNewForm({ ...newForm, title: event.target.value })} />
              <TextInput placeholder="Company" value={newForm.company} onChange={(event) => setNewForm({ ...newForm, company: event.target.value })} />
              <TextInput placeholder="Email" value={newForm.email} onChange={(event) => setNewForm({ ...newForm, email: event.target.value })} />
              <TextInput placeholder="Phone" value={newForm.phone} onChange={(event) => setNewForm({ ...newForm, phone: event.target.value })} />
              <TextInput placeholder="LinkedIn" value={newForm.linkedin} onChange={(event) => setNewForm({ ...newForm, linkedin: event.target.value })} />
              <TextInput placeholder="Twitter" value={newForm.twitter} onChange={(event) => setNewForm({ ...newForm, twitter: event.target.value })} />
              <TextInput placeholder="Referral source" value={newForm.referral_source} onChange={(event) => setNewForm({ ...newForm, referral_source: event.target.value })} />
              <TextInput placeholder="LTV ($)" value={newForm.lifetime_value_cents} onChange={(event) => setNewForm({ ...newForm, lifetime_value_cents: event.target.value })} type="number" />
              <TextArea placeholder="Interests" value={newForm.interests} onChange={(event) => setNewForm({ ...newForm, interests: event.target.value })} />
              <TextArea placeholder="Notes" value={newForm.notes} onChange={(event) => setNewForm({ ...newForm, notes: event.target.value })} />
              <div className="flex items-center gap-3">
                <ActionButton onClick={() => void submitNew()} disabled={saving}>{saving ? "Saving..." : "Create Contact"}</ActionButton>
                {error ? <span className="text-sm text-destructive">{error}</span> : null}
              </div>
            </div>
          </div>
        ) : detail ? (
          loadingDetail ? (
            <div className="p-6 text-sm text-muted-foreground">Loading contact...</div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border bg-gradient-to-br from-accent/10 via-secondary/20 to-transparent p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar initials={initials(detail.name)} gradient />
                    <div>
                      <div className="text-2xl font-bold text-foreground">{detail.name}</div>
                      <div className="text-sm text-muted-foreground">{detail.title ?? "No title"} · {detail.company ?? "No company"}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <HealthBadge tier={detail.health_tier} />
                        <Badge tone="muted">score {detail.health_score}</Badge>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="rounded-lg p-2 hover:bg-secondary"><X size={18} /></button>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[120px,1fr]">
                  <ScoreRing score={detail.health_score} />
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <GhostButton onClick={() => setActivityForm((current) => ({ ...current, kind: "call" }))}><Phone size={14} className="mr-2" />Call</GhostButton>
                      <GhostButton onClick={() => setActivityForm((current) => ({ ...current, kind: "email" }))}><Mail size={14} className="mr-2" />Email</GhostButton>
                      <GhostButton onClick={() => setActivityForm((current) => ({ ...current, kind: "note" }))}><MessageSquare size={14} className="mr-2" />Note</GhostButton>
                      <GhostButton onClick={() => setActivityForm((current) => ({ ...current, kind: "meeting" }))}><CalendarDays size={14} className="mr-2" />Meeting</GhostButton>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Summary</div>
                      <div className="mt-2 text-sm leading-6 text-foreground">{detail.ai_summary || detail.computed_summary}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <details open className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">Relationship Timeline</summary>
                  <div className="mt-4 space-y-3">
                    {detail.activities.length ? detail.activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />) : <EmptyState title="No interactions logged yet." />}
                  </div>
                </details>

                <section className="rounded-xl border border-border p-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">Add Activity</div>
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
                </section>

                <details className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">Profile Details</summary>
                  <div className="mt-4 grid gap-3">
                    <TextInput placeholder="Title" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                    <TextInput placeholder="Company" value={editForm.company} onChange={(event) => setEditForm({ ...editForm, company: event.target.value })} />
                    <TextInput placeholder="Email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
                    <TextInput placeholder="Phone" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
                    <TextInput placeholder="LinkedIn" value={editForm.linkedin} onChange={(event) => setEditForm({ ...editForm, linkedin: event.target.value })} />
                    <TextInput placeholder="Twitter" value={editForm.twitter} onChange={(event) => setEditForm({ ...editForm, twitter: event.target.value })} />
                    <TextInput type="date" placeholder="Birthday" value={editForm.birthday} onChange={(event) => setEditForm({ ...editForm, birthday: event.target.value })} />
                    <TextInput placeholder="Referral source" value={editForm.referral_source} onChange={(event) => setEditForm({ ...editForm, referral_source: event.target.value })} />
                    <TextInput type="date" placeholder="First contact date" value={editForm.first_contact_date} onChange={(event) => setEditForm({ ...editForm, first_contact_date: event.target.value })} />
                    <TextInput type="number" placeholder="Lifetime value ($)" value={editForm.lifetime_value_cents} onChange={(event) => setEditForm({ ...editForm, lifetime_value_cents: event.target.value })} />
                    <TextInput placeholder="Interests" value={editForm.interests} onChange={(event) => setEditForm({ ...editForm, interests: event.target.value })} />
                    <TextInput placeholder="Tags, comma separated" value={editForm.tags} onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })} />
                    <TextArea placeholder="Notes" value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} onBlur={(event) => void saveNotes(event.target.value)} />
                    <div className="flex gap-3">
                      <ActionButton onClick={() => void saveProfile()} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</ActionButton>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )
        ) : null}
      </SlideOver>

      {error ? <div className="px-6 text-sm text-destructive">{error}</div> : null}
    </PageSection>
  );
}

function HealthDot({ tier }: { tier: string }) {
  const map = {
    healthy: "bg-success",
    at_risk: "bg-warning",
    cold: "bg-destructive",
  };
  return <span className={`mt-1 h-2.5 w-2.5 rounded-full ${map[tier as keyof typeof map] ?? map.healthy}`} />;
}

function HealthBadge({ tier }: { tier: string }) {
  if (tier === "healthy") return <Badge tone="success">❤️ Healthy</Badge>;
  if (tier === "at_risk") return <Badge tone="warning">⚠️ At Risk</Badge>;
  return <Badge tone="destructive">❌ Cold</Badge>;
}

function formatTier(tier: string) {
  if (tier === "at_risk") return "at risk";
  return tier;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const stroke = 8;
  const normalized = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  return (
    <div className="flex items-center justify-center">
      <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
        <circle cx="55" cy="55" r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-secondary" />
        <circle cx="55" cy="55" r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} className="text-accent transition-all duration-500" strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-foreground">{normalized}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">health</div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ContactActivityRow }) {
  const config = activityKindConfig(activity.kind);
  const Icon = config.icon;
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.className}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{activity.subject ?? activity.kind}</div>
        {activity.body ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activity.body}</div> : null}
        <div className="mt-1 text-xs text-muted-foreground">
          {activity.user_name ?? "System"} · {timeAgo(activity.occurred_at)}
          {activity.sentiment && (activity.kind === "call" || activity.kind === "email") ? <span className="ml-2">{sentimentEmoji(activity.sentiment)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function activityKindConfig(kind: string) {
  if (kind === "call") return { icon: Phone, className: "bg-accent/10 text-accent" };
  if (kind === "email") return { icon: Mail, className: "bg-success/10 text-success" };
  if (kind === "meeting") return { icon: CalendarDays, className: "bg-chart-4/10 text-chart-4" };
  return { icon: MessageSquare, className: "bg-warning/10 text-warning" };
}

function sentimentEmoji(sentiment: string) {
  if (sentiment === "positive") return "😊";
  if (sentiment === "negative") return "😠";
  return "😐";
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

function HealthStatePill({ tier }: { tier: string }) {
  return <ToneBadge tone={tier === "healthy" ? "success" : tier === "at_risk" ? "warning" : "destructive"}>{formatTier(tier)}</ToneBadge>;
}
