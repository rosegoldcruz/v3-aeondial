"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2, Phone } from "lucide-react";
import { Avatar, Badge, ProgressBar, Row, Stat } from "@/components/ui/primitives";
import {
  ActionButton,
  DataTable,
  GhostButton,
  PageSection,
  SelectInput,
  StatGrid,
  TableHeader,
  TableShell,
  Td,
  TextInput,
  ToneBadge,
  Th,
  statusTone,
} from "@/components/pages/common";
import { formatDate, formatShortDate, initials, money, stageTone, timeAgo } from "@/lib/ui/format";
import type { Campaign, User } from "@/types/models";
import type { NamedActivity, NamedContact, NamedDeal, NamedLead } from "@/lib/data/workspace";

const leadStatuses = ["all", "new", "contacted", "qualified", "disqualified"] as const;
const dealStages = ["all", "lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
const activityKinds = ["all", "call", "email", "note", "meeting", "task"] as const;

export function CRMLeadsClient({ leads, users }: { leads: NamedLead[]; users: User[] }) {
  const [rows, setRows] = useState(leads);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof leadStatuses)[number]>("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", source: "Referral", status: "new" });

  const filtered = useMemo(() => rows.filter((lead) => {
    const haystack = `${lead.name} ${lead.company ?? ""} ${lead.email ?? ""} ${lead.phone ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === "all" || lead.status === status);
  }), [rows, search, status]);

  async function submit() {
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "lead", ...form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to save lead");
      return;
    }
    setRows([data as NamedLead, ...rows]);
    setSuccess("Lead saved");
    setForm({ name: "", company: "", phone: "", email: "", source: "Referral", status: "new" });
    setShowForm(false);
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    const res = await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    if (res.ok) setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Leads" value={String(rows.length)} />
        <Stat label="New This Week" value={String(rows.filter((lead) => Date.now() - new Date(lead.created_at).getTime() < 7 * 86400000).length)} />
        <Stat label="Qualified" value={String(rows.filter((lead) => lead.status === "qualified").length)} />
        <Stat label="Disqualified" value={String(rows.filter((lead) => lead.status === "disqualified").length)} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-[1fr,180px,auto]">
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads" />
        <SelectInput value={status} onChange={(event) => setStatus(event.target.value as (typeof leadStatuses)[number])}>
          {leadStatuses.map((option) => <option key={option} value={option}>{option === "all" ? "All statuses" : option}</option>)}
        </SelectInput>
        <ActionButton onClick={() => setShowForm((open) => !open)}><Plus size={16} className="mr-2" />New Lead</ActionButton>
      </div>

      {showForm ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2 xl:grid-cols-6">
          <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Lead name" />
          <TextInput value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company" />
          <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" />
          <TextInput value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
          <TextInput value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Source" />
          <SelectInput value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="qualified">qualified</option>
            <option value="disqualified">disqualified</option>
          </SelectInput>
          <div className="md:col-span-2 xl:col-span-6 flex items-center gap-3">
            <ActionButton onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save Lead"}</ActionButton>
            <GhostButton onClick={() => setShowForm(false)}>Cancel</GhostButton>
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
            {success ? <span className="text-sm text-success">{success}</span> : null}
          </div>
        </div>
      ) : null}

      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th>Source</Th>
                <Th>Owner</Th>
                <Th>Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <Td className="font-medium">{lead.name}</Td>
                  <Td>{lead.company ?? "Unknown"}</Td>
                  <Td>{lead.phone ?? "No phone"}</Td>
                  <Td>{lead.email ?? "No email"}</Td>
                  <Td><ToneBadge tone={stageTone(lead.status)}>{lead.status}</ToneBadge></Td>
                  <Td>{lead.source ?? "Direct"}</Td>
                  <Td>{lead.owner_name ?? users[0]?.name ?? "Unassigned"}</Td>
                  <Td>{formatShortDate(lead.created_at)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      {lead.phone ? (
                        <GhostButton
                          className="h-8 w-8 px-0 text-emerald-400"
                          title="Call"
                          onClick={() => window.open(`/dialer/live?call=${encodeURIComponent(lead.phone!)}`, "_blank")}
                        >
                          <Phone size={14} />
                        </GhostButton>
                      ) : null}
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Eye size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Pencil size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" onClick={() => void deleteLead(lead.id)}><Trash2 size={14} /></GhostButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function CRMContactsClient({ contacts }: { contacts: NamedContact[] }) {
  const [rows, setRows] = useState(contacts);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => rows.filter((contact) => `${contact.name} ${contact.company ?? ""} ${contact.email ?? ""} ${contact.phone ?? ""}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  async function submit() {
    setError("");
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to save contact");
      return;
    }
    setRows([data as NamedContact, ...rows]);
    setForm({ name: "", company: "", email: "", phone: "" });
    setShowForm(false);
  }

  async function deleteContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/crm/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Contacts" value={String(rows.length)} />
        <Stat label="With Email" value={String(rows.filter((contact) => Boolean(contact.email)).length)} />
        <Stat label="With Phone" value={String(rows.filter((contact) => Boolean(contact.phone)).length)} />
        <Stat label="Tagged" value={String(rows.filter((contact) => contact.tags.length > 0).length)} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" />
        <ActionButton onClick={() => setShowForm((open) => !open)}><Plus size={16} className="mr-2" />New Contact</ActionButton>
      </div>

      {showForm ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2 xl:grid-cols-4">
          <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
          <TextInput value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company" />
          <TextInput value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
          <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" />
          <div className="xl:col-span-4 flex items-center gap-3">
            <ActionButton onClick={submit}>Save Contact</ActionButton>
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
          </div>
        </div>
      ) : null}

      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Tags</Th>
                <Th>Owner</Th>
                <Th>Last Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} className="border-t border-border">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(contact.name)} />
                      <span className="font-medium">{contact.name}</span>
                    </div>
                  </Td>
                  <Td>{contact.company ?? "No company"}</Td>
                  <Td>{contact.email ?? "No email"}</Td>
                  <Td>{contact.phone ?? "No phone"}</Td>
                  <Td><div className="flex flex-wrap gap-2">{contact.tags.length ? contact.tags.map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>) : <Badge tone="muted">untagged</Badge>}</div></Td>
                  <Td>{contact.owner_name ?? "Unassigned"}</Td>
                  <Td>{formatDate(contact.updated_at)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      {contact.phone ? (
                        <GhostButton
                          className="h-8 w-8 px-0 text-emerald-400"
                          title="Call"
                          onClick={() => window.open(`/dialer/live?call=${encodeURIComponent(contact.phone!)}`, "_blank")}
                        >
                          <Phone size={14} />
                        </GhostButton>
                      ) : null}
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Eye size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Pencil size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" onClick={() => void deleteContact(contact.id)}><Trash2 size={14} /></GhostButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function CRMDealsClient({ deals }: { deals: NamedDeal[] }) {
  const [rows, setRows] = useState(deals);
  const [stage, setStage] = useState<(typeof dealStages)[number]>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", value_cents: 250000, stage: "lead" });
  const [error, setError] = useState("");

  const filtered = useMemo(() => rows.filter((deal) => stage === "all" || deal.stage === stage), [rows, stage]);
  const total = rows.length;
  const open = rows.filter((deal) => !["won", "lost"].includes(deal.stage)).length;
  const won = rows.filter((deal) => deal.stage === "won").length;
  const lost = rows.filter((deal) => deal.stage === "lost").length;
  const lostRate = total === 0 ? 0 : Math.round((lost / total) * 100);

  async function submit() {
    setError("");
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "deal", ...form }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to save deal");
      return;
    }
    setRows([data as NamedDeal, ...rows]);
    setShowForm(false);
    setForm({ title: "", value_cents: 250000, stage: "lead" });
  }

  async function deleteDeal(id: string) {
    if (!confirm("Delete this deal?")) return;
    const res = await fetch(`/api/crm/deals/${id}`, { method: "DELETE" });
    if (res.ok) setRows(rows.filter((r) => r.id !== id));
  }

  async function updateDealStage(id: string, newStage: string) {
    const res = await fetch(`/api/crm/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    const data = await res.json();
    if (res.ok) setRows(rows.map((r) => r.id === id ? { ...r, ...data } : r));
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Deals" value={String(total)} />
        <Stat label="Open" value={String(open)} />
        <Stat label="Won" value={String(won)} />
        <Stat label="Lost Rate" value={`${lostRate}%`} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-[180px,auto]">
        <SelectInput value={stage} onChange={(event) => setStage(event.target.value as (typeof dealStages)[number])}>
          {dealStages.map((option) => <option key={option} value={option}>{option === "all" ? "All stages" : option}</option>)}
        </SelectInput>
        <div className="flex justify-end">
          <ActionButton onClick={() => setShowForm((openState) => !openState)}><Plus size={16} className="mr-2" />New Deal</ActionButton>
        </div>
      </div>

      {showForm ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-3">
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Deal title" />
          <TextInput type="number" value={String(Math.round(form.value_cents / 100))} onChange={(event) => setForm({ ...form, value_cents: Number(event.target.value || 0) * 100 })} placeholder="Value" />
          <SelectInput value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
            {dealStages.filter((option) => option !== "all").map((option) => <option key={option} value={option}>{option}</option>)}
          </SelectInput>
          <div className="md:col-span-3 flex items-center gap-3">
            <ActionButton onClick={submit}>Save Deal</ActionButton>
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
          </div>
        </div>
      ) : null}

      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Title</Th>
                <Th>Contact</Th>
                <Th>Stage</Th>
                <Th>Value</Th>
                <Th>Owner</Th>
                <Th>Close Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((deal) => (
                <tr key={deal.id} className="border-t border-border">
                  <Td className="font-medium">{deal.title}</Td>
                  <Td>{deal.contact_name ?? "Unassigned"}</Td>
                  <Td>
                    <SelectInput
                      value={deal.stage}
                      onChange={(event) => void updateDealStage(deal.id, event.target.value)}
                      className="h-7 text-xs"
                    >
                      {dealStages.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}
                    </SelectInput>
                  </Td>
                  <Td className="text-accent">{money(deal.value_cents)}</Td>
                  <Td>{deal.owner_name ?? "Open queue"}</Td>
                  <Td>{formatDate(deal.expected_close)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Eye size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" title="Coming soon" disabled><Pencil size={14} /></GhostButton>
                      <GhostButton className="h-8 w-8 px-0" onClick={() => void deleteDeal(deal.id)}><Trash2 size={14} /></GhostButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function CRMActivitiesClient({ activities }: { activities: NamedActivity[] }) {
  const [rows, setRows] = useState(activities);
  const [kind, setKind] = useState<(typeof activityKinds)[number]>("all");
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");

  const filtered = useMemo(() => rows.filter((activity) => kind === "all" || activity.kind === kind), [rows, kind]);

  async function submit() {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "activity", subject }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setRows([data as NamedActivity, ...rows]);
    setSubject("");
    setShowForm(false);
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Calls" value={String(rows.filter((activity) => activity.kind === "call").length)} />
        <Stat label="Emails" value={String(rows.filter((activity) => activity.kind === "email").length)} />
        <Stat label="Meetings" value={String(rows.filter((activity) => activity.kind === "meeting").length)} />
        <Stat label="Tasks Logged" value={String(rows.filter((activity) => activity.kind === "task").length)} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-[180px,auto]">
        <SelectInput value={kind} onChange={(event) => setKind(event.target.value as (typeof activityKinds)[number])}>
          {activityKinds.map((option) => <option key={option} value={option}>{option === "all" ? "All kinds" : option}</option>)}
        </SelectInput>
        <div className="flex justify-end"><ActionButton onClick={() => setShowForm((open) => !open)}><Plus size={16} className="mr-2" />Log Activity</ActionButton></div>
      </div>

      {showForm ? (
        <div className="flex gap-3 rounded-xl border border-border bg-card p-5">
          <TextInput value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Activity subject" />
          <ActionButton onClick={submit}>Save</ActionButton>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="space-y-1">
          {filtered.map((activity, index) => (
            <Row key={activity.id} delay={index * 40}>
              <div className="flex items-center gap-3">
                <Avatar initials={activity.kind.slice(0, 1).toUpperCase()} />
                <div>
                  <div className="text-sm font-medium text-foreground">{activity.subject ?? activity.kind}</div>
                  <div className="text-xs text-muted-foreground">{activity.contact_name ?? activity.deal_title ?? "General"} · {activity.user_name ?? "AEON"} · {timeAgo(activity.occurred_at)}</div>
                </div>
              </div>
              <ToneBadge tone={statusTone(activity.kind)}>{activity.kind}</ToneBadge>
            </Row>
          ))}
        </div>
      </div>
    </PageSection>
  );
}

export function CRMCampaignsClient({ campaigns }: { campaigns: Campaign[] }) {
  const [rows, setRows] = useState(campaigns);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "email", status: "draft" });

  async function submit() {
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "campaign", ...form }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setRows([data as Campaign, ...rows]);
    setForm({ name: "", type: "email", status: "draft" });
    setShowForm(false);
  }

  const avgOpen = rows.length ? Math.round(rows.reduce((sum, campaign) => sum + (campaign.sent ? campaign.opens / campaign.sent : 0), 0) / rows.length * 100) : 0;

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Campaigns" value={String(rows.length)} />
        <Stat label="Active" value={String(rows.filter((campaign) => campaign.status === "active").length)} />
        <Stat label="Sent" value={String(rows.reduce((sum, campaign) => sum + campaign.sent, 0))} />
        <Stat label="Avg Open Rate" value={`${avgOpen}%`} />
      </StatGrid>
      <div className="flex justify-end">
        <ActionButton onClick={() => setShowForm((open) => !open)}><Plus size={16} className="mr-2" />New Campaign</ActionButton>
      </div>
      {showForm ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-3">
          <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Campaign name" />
          <SelectInput value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="email">email</option>
            <option value="sms">sms</option>
            <option value="dialer">dialer</option>
            <option value="marketing">marketing</option>
          </SelectInput>
          <SelectInput value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="completed">completed</option>
          </SelectInput>
          <div className="md:col-span-3">
            <ActionButton onClick={submit}>Save Campaign</ActionButton>
          </div>
        </div>
      ) : null}
      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Sent</Th>
                <Th>Opens</Th>
                <Th>Clicks</Th>
                <Th>Created</Th>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((campaign) => (
                <tr key={campaign.id} className="border-t border-border">
                  <Td className="font-medium">{campaign.name}</Td>
                  <Td><ToneBadge tone="accent">{campaign.type}</ToneBadge></Td>
                  <Td><ToneBadge tone={statusTone(campaign.status)}>{campaign.status}</ToneBadge></Td>
                  <Td>{campaign.sent}</Td>
                  <Td>{campaign.opens}</Td>
                  <Td>{campaign.clicks}</Td>
                  <Td>{formatShortDate(campaign.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function CRMOpportunitiesTable({ deals }: { deals: NamedDeal[] }) {
  const rows = deals.filter((deal) => !["won", "lost"].includes(deal.stage)).map((deal) => {
    const probability = probabilityForStage(deal.stage);
    return { ...deal, probability, weighted: Math.round(deal.value_cents * (probability / 100)) };
  });

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Weighted Pipeline" value={money(rows.reduce((sum, row) => sum + row.weighted, 0))} />
        <Stat label="Expected Close This Month" value={money(rows.filter((row) => row.expected_close && new Date(row.expected_close).getMonth() === new Date().getMonth()).reduce((sum, row) => sum + row.weighted, 0))} />
        <Stat label="Avg Deal Size" value={money(rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.value_cents), 0) / rows.length) : 0)} />
        <Stat label="Win Rate %" value={`${Math.round((deals.filter((deal) => deal.stage === "won").length / Math.max(1, deals.length)) * 100)}%`} />
      </StatGrid>

      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Title</Th>
                <Th>Contact</Th>
                <Th>Stage</Th>
                <Th>Probability</Th>
                <Th>Weighted Value</Th>
                <Th>Close Date</Th>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((deal) => (
                <tr key={deal.id} className="border-t border-border">
                  <Td className="font-medium">{deal.title}</Td>
                  <Td>{deal.contact_name ?? "Open contact"}</Td>
                  <Td><ToneBadge tone={stageTone(deal.stage)}>{deal.stage}</ToneBadge></Td>
                  <Td>
                    <div className="space-y-2">
                      <div className="text-sm text-foreground">{deal.probability}%</div>
                      <ProgressBar value={deal.probability} />
                    </div>
                  </Td>
                  <Td className="text-accent">{money(deal.weighted)}</Td>
                  <Td>{formatDate(deal.expected_close)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

function probabilityForStage(stage: string) {
  if (stage === "lead") return 20;
  if (stage === "qualified") return 45;
  if (stage === "proposal") return 65;
  if (stage === "negotiation") return 80;
  if (stage === "won") return 100;
  return 0;
}
