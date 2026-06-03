"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Eye, Pause, Play, Plus, Send, Trash2, Upload } from "lucide-react";
import { Avatar, Badge, Stat } from "@/components/ui/primitives";
import {
  ActionButton,
  DataTable,
  GhostButton,
  PageSection,
  SectionCard,
  SelectInput,
  StatGrid,
  TableHeader,
  TableShell,
  Td,
  TextArea,
  TextInput,
  Th,
} from "@/components/pages/common";
import { formatDate, formatDateTime, formatShortDate, initials, money, stageTone, timeAgo } from "@/lib/ui/format";
import type { AgentRun, Campaign, Contact, DncNumber, Entity, RagDocument, RagQuery, Subscription, Timesheet, User } from "@/types/models";
import type { NamedSubscription, NamedTimesheet, NamedTransaction, NamedTask, NamedBid } from "@/lib/data/workspace";

export function MarketingEmailClient({ campaigns, contacts, connected }: { campaigns: Campaign[]; contacts: Contact[]; connected: boolean }) {
  return (
    <ComposerClient
      title="Email"
      campaigns={campaigns.filter((campaign) => campaign.type === "email" || campaign.type === "marketing")}
      contacts={contacts}
      connected={connected}
      connectLabel="Connect SendGrid"
      apiType="email"
      placeholder="Write the email body"
      statLabelA="Emails Sent"
      statLabelB="Open Rate"
      statLabelC="Click Rate"
      statLabelD="Unsubscribes"
      charCount={false}
    />
  );
}

export function MarketingSmsClient({ campaigns, contacts, connected }: { campaigns: Campaign[]; contacts: Contact[]; connected: boolean }) {
  return (
    <ComposerClient
      title="SMS"
      campaigns={campaigns.filter((campaign) => campaign.type === "sms")}
      contacts={contacts}
      connected={connected}
      connectLabel="Connect Telnyx"
      apiType="sms"
      placeholder="Write the SMS copy"
      statLabelA="Messages Sent"
      statLabelB="Delivery Rate"
      statLabelC="Reply Rate"
      statLabelD="Opt Outs"
      charCount
    />
  );
}

function ComposerClient({
  title,
  campaigns,
  contacts,
  connected,
  connectLabel,
  apiType,
  placeholder,
  statLabelA,
  statLabelB,
  statLabelC,
  statLabelD,
  charCount,
}: {
  title: string;
  campaigns: Campaign[];
  contacts: Contact[];
  connected: boolean;
  connectLabel: string;
  apiType: "email" | "sms";
  placeholder: string;
  statLabelA: string;
  statLabelB: string;
  statLabelC: string;
  statLabelD: string;
  charCount: boolean;
}) {
  const [rows, setRows] = useState(campaigns);
  const [form, setForm] = useState({ to: contacts[0]?.id ?? "", subject: "", body: "", status: "draft" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(status: "draft" | "active") {
    setError("");
    setSuccess("");
    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: apiType, status, name: form.subject || form.body, body: form.body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to send");
      return;
    }
    setRows([data as Campaign, ...rows]);
    setSuccess(status === "active" ? `${title} queued` : `${title} saved`);
    setForm({ ...form, subject: "", body: "" });
  }

  const totalSent = rows.reduce((sum, row) => sum + row.sent, 0);
  const openRate = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.sent ? row.opens / row.sent : 0), 0) / rows.length * 100) : 0;
  const clickRate = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.sent ? row.clicks / row.sent : 0), 0) / rows.length * 100) : 0;
  const unsubscribes = Math.max(0, rows.length - rows.filter((row) => row.status === "active").length);

  return (
    <PageSection>
      <StatGrid>
        <Stat label={statLabelA} value={String(totalSent)} />
        <Stat label={statLabelB} value={`${openRate}%`} />
        <Stat label={statLabelC} value={`${clickRate}%`} />
        <Stat label={statLabelD} value={String(unsubscribes)} />
      </StatGrid>
      <SectionCard title={`${title} Composer`} action={connected ? <Badge tone="success">Connected</Badge> : <ActionButton>{connectLabel}</ActionButton>}>
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            <SelectInput value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })}>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
            </SelectInput>
            {apiType === "email" ? <TextInput value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" /> : null}
            <TextArea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder={placeholder} />
            {charCount ? <div className="text-xs text-muted-foreground">{form.body.length} characters</div> : null}
            <div className="flex items-center gap-3">
              <ActionButton onClick={() => submit("active")}><Send size={14} className="mr-2" />Send Now</ActionButton>
              <GhostButton onClick={() => submit("draft")}>Schedule</GhostButton>
              {error ? <span className="text-sm text-destructive">{error}</span> : null}
              {success ? <span className="text-sm text-success">{success}</span> : null}
            </div>
          </div>
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>Sent</Th>
                    <Th>Opens</Th>
                    <Th>Clicks</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {rows.map((campaign) => (
                    <tr key={campaign.id} className="border-t border-border">
                      <Td className="font-medium">{campaign.name}</Td>
                      <Td><Badge tone={stageTone(campaign.status)}>{campaign.status}</Badge></Td>
                      <Td>{campaign.sent}</Td>
                      <Td>{campaign.opens}</Td>
                      <Td>{campaign.clicks}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </DataTable>
        </div>
      </SectionCard>
    </PageSection>
  );
}

export function MarketingMaterialsClient({ runs, connected }: { runs: AgentRun[]; connected: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const history = runs.filter((run) => run.kind === "asset" || run.kind === "marketing").slice(0, 6);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "asset", prompt }),
    });
    const data = await res.json();
    setLoading(false);
    setOutput(res.ok ? String(data.output ?? "") : String(data.error ?? ""));
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Assets Generated" value={String(history.length)} />
        <Stat label="This Month" value={String(history.filter((run) => new Date(run.created_at).getMonth() === new Date().getMonth()).length)} />
        <Stat label="Templates" value="6" />
        <Stat label="Saved" value={String(history.filter((run) => run.status === "done").length)} />
      </StatGrid>
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard title="Generate Material" action={connected ? <Badge tone="success">DeepSeek Connected</Badge> : <Badge tone="warning">Add API key in /admin/integrations</Badge>}>
          <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the marketing material you need..." />
          <div className="mt-3 flex items-center gap-3">
            <ActionButton onClick={generate} disabled={!prompt || loading}>{loading ? "Generating..." : "Generate"}</ActionButton>
            {output ? <GhostButton onClick={() => navigator.clipboard.writeText(output)}><Copy size={14} className="mr-2" />Copy</GhostButton> : null}
          </div>
        </SectionCard>
        <SectionCard title="Output">
          <div className="min-h-[260px] rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">
            {output || "Generated copy, brief, and creative specs will appear here."}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Recent Generations">
        <div className="space-y-3">
          {history.map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-foreground">{run.prompt.slice(0, 80)}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(run.created_at)}</div>
              </div>
              <GhostButton onClick={() => navigator.clipboard.writeText(run.output ?? "")}><Copy size={14} /></GhostButton>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageSection>
  );
}

export function MarketingAutomationClient({ campaigns }: { campaigns: Campaign[] }) {
  const [rows, setRows] = useState(campaigns.slice(0, 4).map((campaign, index) => ({
    id: campaign.id,
    label: campaign.name,
    trigger: index % 2 === 0 ? "lead created" : "deal won",
    condition: index % 2 === 0 ? "source = referral" : "value > $10k",
    action: campaign.type === "sms" ? "send SMS" : "send email",
    active: campaign.status !== "paused",
  })));

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Active Flows" value={String(rows.filter((row) => row.active).length)} />
        <Stat label="Triggered This Month" value="184" />
        <Stat label="Success Rate" value="96%" />
        <Stat label="Pending" value={String(rows.filter((row) => !row.active).length)} />
      </StatGrid>
      <SectionCard title="Automation Flows" action={<ActionButton><Plus size={14} className="mr-2" />New Automation</ActionButton>}>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="accent">{row.trigger}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge tone="warning">{row.condition}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge tone="success">{row.action}</Badge>
              </div>
              <GhostButton onClick={() => setRows(rows.map((item) => item.id === row.id ? { ...item, active: !item.active } : item))}>
                {row.active ? <Pause size={14} className="mr-2" /> : <Play size={14} className="mr-2" />}
                {row.active ? "Pause" : "Resume"}
              </GhostButton>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageSection>
  );
}

export function IntelligenceChatClient({ queries, connected }: { queries: RagQuery[]; connected: boolean }) {
  const [rows, setRows] = useState(queries);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const active = rows[0];
  const history = rows.slice(0, 8);

  async function submit(prompt: string) {
    setLoading(true);
    setQuestion(prompt);
    const res = await fetch("/api/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prompt }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setAnswer(String(data.answer ?? ""));
      setRows([{ id: crypto.randomUUID(), org_id: rows[0]?.org_id ?? "", user_id: null, question: prompt, answer: String(data.answer ?? ""), sources: [], created_at: new Date().toISOString() }, ...rows]);
    } else {
      setAnswer(String(data.error ?? ""));
    }
  }

  const currentQuestion = question || active?.question || "";
  const currentAnswer = answer || active?.answer || "";

  return (
    <PageSection className="h-[calc(100vh-4rem)]">
      <div className="grid h-full gap-6 xl:grid-cols-[320px,1fr]">
        <SectionCard title="Chat History" className="h-full">
          <div className="space-y-2 overflow-y-auto">
            {history.map((item) => (
              <button key={item.id} onClick={() => { setQuestion(item.question); setAnswer(item.answer ?? ""); }} className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-3 text-left transition hover:border-accent/40">
                <div className="text-sm font-medium text-foreground">{item.question.slice(0, 56)}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</div>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Ask AEON" className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {currentQuestion ? (
              <>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">{currentQuestion}</div>
                <div className="max-w-[85%] rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">FX</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AEON</div>
                  </div>
                  <div className="whitespace-pre-wrap leading-6">{loading ? "Thinking..." : currentAnswer}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="muted">Sales report</Badge>
                    <Badge tone="muted">Finance ledger</Badge>
                    <Badge tone="muted">CRM notes</Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="text-lg font-semibold text-foreground">Ask AEON anything about the business</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["What changed in pipeline this week?", "Show cabinet margin risk", "Summarize open ops blockers"].map((sample) => (
                    <GhostButton key={sample} onClick={() => submit(sample)}>{sample}</GhostButton>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-end gap-3">
            <TextArea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={connected ? "Ask AEON a grounded question" : "Add DEEPSEEK_API_KEY in /admin/integrations"} className="min-h-[88px]" />
            <ActionButton onClick={() => submit(question)} disabled={!connected || !question || loading}><Send size={14} className="mr-2" />Send</ActionButton>
          </div>
        </SectionCard>
      </div>
    </PageSection>
  );
}

export function IntelligenceQueriesClient({ queries }: { queries: RagQuery[] }) {
  const [selected, setSelected] = useState<RagQuery | null>(queries[0] ?? null);
  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Queries" value={String(queries.length)} />
        <Stat label="This Week" value={String(queries.filter((query) => Date.now() - new Date(query.created_at).getTime() < 7 * 86400000).length)} />
        <Stat label="Avg Response Time" value="1.8s" />
        <Stat label="Top Topic" value="Pipeline" />
      </StatGrid>
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Question</Th>
                  <Th>Answer Preview</Th>
                  <Th>User</Th>
                  <Th>Timestamp</Th>
                </tr>
              </TableHeader>
              <tbody>
                {queries.map((query) => (
                  <tr key={query.id} className="cursor-pointer border-t border-border hover:bg-secondary/30" onClick={() => setSelected(query)}>
                    <Td className="font-medium">{query.question.slice(0, 64)}</Td>
                    <Td>{(query.answer ?? "").slice(0, 72)}</Td>
                    <Td>{query.user_id ? "User" : "AEON"}</Td>
                    <Td>{formatDateTime(query.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </DataTable>
        <SectionCard title="Selected Query">
          {selected ? (
            <div className="space-y-4 text-sm leading-6 text-foreground">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Question</div>
                <div className="mt-1">{selected.question}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Answer</div>
                <div className="mt-1 whitespace-pre-wrap">{selected.answer ?? "No answer logged."}</div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>
    </PageSection>
  );
}

export function AgentWorkbenchClient({ runs, kind, connected }: { runs: AgentRun[]; kind: "code" | "marketing" | "asset"; connected: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState(runs.find((run) => run.kind === kind)?.output ?? "");
  const [loading, setLoading] = useState(false);
  const history = runs.filter((run) => run.kind === kind).slice(0, 6);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, prompt }),
    });
    const data = await res.json();
    setLoading(false);
    setOutput(res.ok ? String(data.output ?? "") : String(data.error ?? ""));
  }

  return (
    <PageSection>
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <SectionCard title={kind === "code" ? "Coding Agent" : kind === "marketing" ? "Marketing Agent" : "Asset Agent"} action={connected ? <Badge tone="success">DeepSeek Connected</Badge> : <Badge tone="warning">Add API key in /admin/integrations</Badge>}>
          <SelectInput value={kind} disabled>
            <option>{kind === "code" ? "Code" : kind === "marketing" ? "Marketing" : "Asset"}</option>
          </SelectInput>
          <div className="mt-3">
            <TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={kind === "code" ? "Describe the code you need..." : kind === "marketing" ? "Describe the campaign or copy..." : "Describe the asset brief..."} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ActionButton onClick={submit} disabled={!connected || !prompt || loading}>{loading ? "Running..." : "Run"}</ActionButton>
            {output ? <GhostButton onClick={() => navigator.clipboard.writeText(output)}><Copy size={14} className="mr-2" />Copy</GhostButton> : null}
          </div>
        </SectionCard>
        <SectionCard title="Output">
          {kind === "code" ? (
            <pre className="min-h-[320px] overflow-x-auto rounded-xl border border-border bg-secondary/40 p-4 text-sm text-foreground">{output || "// Generated code will appear here."}</pre>
          ) : (
            <div className="min-h-[320px] whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-6 text-foreground">{output || "Generated output will appear here."}</div>
          )}
        </SectionCard>
      </div>
      <SectionCard title="Recent Runs">
        <div className="space-y-3">
          {history.map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-foreground">{run.prompt.slice(0, 80)}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(run.created_at)}</div>
              </div>
              <Badge tone={stageTone(run.kind)}>{run.kind}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageSection>
  );
}

export function FinanceLedgerClient({ transactions, entities }: { transactions: NamedTransaction[]; entities: Entity[] }) {
  const [rows, setRows] = useState(transactions);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [form, setForm] = useState({ description: "", amount: "1000", type: "out", category: "Ops" });

  async function submit() {
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "txn", entity_id: entityId, description: form.description, amount_cents: Number(form.amount) * 100, type: form.type, category: form.category }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as NamedTransaction, ...rows]);
  }

  const filtered = rows.filter((row) => !entityId || row.entity_id === entityId);
  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total In" value={money(filtered.filter((row) => row.type === "in").reduce((sum, row) => sum + row.amount_cents, 0))} />
        <Stat label="Total Out" value={money(filtered.filter((row) => row.type === "out").reduce((sum, row) => sum + row.amount_cents, 0))} />
        <Stat label="Net" value={money(filtered.reduce((sum, row) => sum + (row.type === "in" ? row.amount_cents : -row.amount_cents), 0))} />
        <Stat label="This Month" value={money(filtered.filter((row) => new Date(row.occurred_on).getMonth() === new Date().getMonth()).reduce((sum, row) => sum + row.amount_cents, 0))} />
      </StatGrid>
      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-5">
        <SelectInput value={entityId} onChange={(event) => setEntityId(event.target.value)}>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</SelectInput>
        <TextInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
        <TextInput value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Amount" type="number" />
        <SelectInput value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="in">In</option><option value="out">Out</option></SelectInput>
        <div className="flex gap-3">
          <TextInput value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" />
          <ActionButton onClick={submit}>Log</ActionButton>
        </div>
      </div>
      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
                <Th>Entity</Th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <Td>{formatShortDate(row.occurred_on)}</Td>
                  <Td className="font-medium">{row.description}</Td>
                  <Td>{row.category}</Td>
                  <Td><Badge tone={row.type === "in" ? "success" : "destructive"}>{row.type}</Badge></Td>
                  <Td>{money(row.amount_cents)}</Td>
                  <Td>{row.entity_name ?? "Entity"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function FinanceSubscriptionsClient({ subscriptions, entities }: { subscriptions: NamedSubscription[]; entities: Entity[] }) {
  const [rows, setRows] = useState(subscriptions);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [form, setForm] = useState({ name: "", amount: "250", category: "Software" });

  async function submit() {
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId, name: form.name, amount_cents: Number(form.amount) * 100, category: form.category }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as NamedSubscription, ...rows]);
  }

  const filtered = rows.filter((row) => !entityId || row.entity_id === entityId);
  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Monthly Burn" value={money(filtered.reduce((sum, row) => sum + (row.active ? row.amount_cents : 0), 0))} />
        <Stat label="Active Subscriptions" value={String(filtered.filter((row) => row.active).length)} />
        <Stat label="Paused" value={String(filtered.filter((row) => !row.active).length)} />
        <Stat label="Categories" value={String(new Set(filtered.map((row) => row.category)).size)} />
      </StatGrid>
      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        <SelectInput value={entityId} onChange={(event) => setEntityId(event.target.value)}>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</SelectInput>
        <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Subscription" />
        <TextInput value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} type="number" placeholder="Amount" />
        <div className="flex gap-3">
          <TextInput value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" />
          <ActionButton onClick={submit}>Add</ActionButton>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.entity_name ?? "Entity"}</div>
              </div>
              <Badge tone={row.active ? "success" : "muted"}>{row.active ? "active" : "paused"}</Badge>
            </div>
            <div className="mt-4 text-xl font-semibold text-accent">{money(row.amount_cents)}/mo</div>
            <div className="mt-3 flex items-center justify-between">
              <Badge tone="muted">{row.category}</Badge>
              <div className="flex gap-2">
                <GhostButton onClick={() => setRows(rows.map((item) => item.id === row.id ? { ...item, active: !item.active } : item))}>{row.active ? <Pause size={14} /> : <Play size={14} />}</GhostButton>
                <GhostButton onClick={() => setRows(rows.filter((item) => item.id !== row.id))}><Trash2 size={14} /></GhostButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export function OpsTasksClient({ tasks, users }: { tasks: NamedTask[]; users: User[] }) {
  const [rows, setRows] = useState(tasks);
  const columns = ["open", "in_progress", "done"];
  const [title, setTitle] = useState("");

  async function submit() {
    const res = await fetch("/api/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind: "tasks" }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as NamedTask, ...rows]);
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Open" value={String(rows.filter((task) => task.status === "open").length)} />
        <Stat label="In Progress" value={String(rows.filter((task) => task.status === "in_progress").length)} />
        <Stat label="Done This Week" value={String(rows.filter((task) => task.status === "done" && Date.now() - new Date(task.updated_at).getTime() < 7 * 86400000).length)} />
        <Stat label="Overdue" value={String(rows.filter((task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== "done").length)} />
      </StatGrid>
      <div className="flex gap-3">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New task title" />
        <ActionButton onClick={submit}><Plus size={14} className="mr-2" />New Task</ActionButton>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => {
          const items = rows.filter((task) => task.status === column);
          return (
            <div key={column} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground capitalize">{column.replace("_", " ")}</div>
                <Badge tone={stageTone(column)}>{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((task) => (
                  <div key={task.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="text-sm font-medium text-foreground">{task.title}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar initials={initials(task.assignee_name ?? users[0]?.name)} />
                        <span className="text-xs text-muted-foreground">{task.assignee_name ?? users[0]?.name ?? "Unassigned"}</span>
                      </div>
                      <Badge tone={stageTone(task.priority)}>{task.priority}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{formatDate(task.due_date)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}

export function OpsSopsClient({ sops }: { sops: { id: string; title: string; category: string | null; version: string; content: string | null; updated_at: string }[] }) {
  const [rows, setRows] = useState(sops);
  const [selected, setSelected] = useState(rows[0] ?? null);
  const [category, setCategory] = useState("all");
  const filtered = rows.filter((sop) => category === "all" || sop.category === category);

  async function createSop() {
    const res = await fetch("/api/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "sops", title: "New SOP", category: "Operations" }),
    });
    const data = await res.json();
    if (res.ok) {
      const next = data as typeof rows[number];
      setRows([next, ...rows]);
      setSelected(next);
    }
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total SOPs" value={String(rows.length)} />
        <Stat label="Categories" value={String(new Set(rows.map((row) => row.category ?? "General")).size)} />
        <Stat label="Recently Updated" value={String(rows.filter((row) => Date.now() - new Date(row.updated_at).getTime() < 30 * 86400000).length)} />
        <Stat label="Pending Review" value="2" />
      </StatGrid>
      <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <SectionCard title="SOP Library" action={<ActionButton onClick={createSop}><Plus size={14} className="mr-2" />New SOP</ActionButton>}>
          <SelectInput value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {[...new Set(rows.map((row) => row.category ?? "General"))].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectInput>
          <div className="mt-4 space-y-2">
            {filtered.map((sop) => (
              <button key={sop.id} onClick={() => setSelected(sop)} className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-3 text-left">
                <div className="text-sm font-medium text-foreground">{sop.title}</div>
                <div className="text-xs text-muted-foreground">{sop.category ?? "General"} · v{sop.version}</div>
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={selected?.title ?? "SOP Viewer"}>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-6 text-foreground">{selected?.content ?? "Select an SOP to review."}</div>
        </SectionCard>
      </div>
    </PageSection>
  );
}

export function InventoryBidsClient({ bids }: { bids: NamedBid[] }) {
  const [rows, setRows] = useState(bids);
  const [form, setForm] = useState({ title: "", line: "framed", price_margin: "0.23", listPrice: "1250" });

  async function submit() {
    const list_cents = Number(form.listPrice) * 100;
    const margin = Number(form.price_margin);
    const res = await fetch("/api/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        line: form.line,
        price_margin: margin,
        lines: [{ description: "Calculator line", qty: 1, list_cents }],
      }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as NamedBid, ...rows]);
  }

  const computedFactor = (1 + Number(form.price_margin)).toFixed(2);
  const bidPrice = Math.round(Number(form.listPrice) * (1 + Number(form.price_margin)));

  return (
    <PageSection>
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <SectionCard title="Bid Calculator">
          <div className="grid gap-3">
            <SelectInput value={form.line} onChange={(event) => setForm({ ...form, line: event.target.value })}><option value="framed">Framed</option><option value="frameless">Frameless</option></SelectInput>
            <TextInput value={form.price_margin} onChange={(event) => setForm({ ...form, price_margin: event.target.value })} placeholder="Price margin" />
            <TextInput value={form.listPrice} onChange={(event) => setForm({ ...form, listPrice: event.target.value })} placeholder="List price" />
            <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Bid title" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">Factor <div className="mt-1 text-xl font-semibold text-foreground">{computedFactor}x</div></div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">Bid Price <div className="mt-1 text-xl font-semibold text-accent">${bidPrice.toLocaleString()}</div></div>
            </div>
            <ActionButton onClick={submit}><Plus size={14} className="mr-2" />Add to Bid</ActionButton>
          </div>
        </SectionCard>
        <SectionCard title="Saved Bids">
          <div className="space-y-3">
            {rows.map((bid) => (
              <div key={bid.id} className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{bid.title}</div>
                    <div className="text-xs text-muted-foreground">{bid.line} · {bid.owner_name ?? "Owner not assigned"}</div>
                  </div>
                  <Badge tone={stageTone(bid.status)}>{bid.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-muted-foreground">Margin</div><div className="text-foreground">{Math.round(bid.price_margin * 100)}%</div></div>
                  <div><div className="text-muted-foreground">List</div><div className="text-foreground">{money(bid.list_total_cents)}</div></div>
                  <div><div className="text-muted-foreground">Bid</div><div className="text-accent">{money(bid.bid_total_cents)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageSection>
  );
}

export function FilesDocumentsClient({ docs }: { docs: RagDocument[] }) {
  const [rows, setRows] = useState(docs);
  const [title, setTitle] = useState("");
  async function submit() {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, source: "upload", status: "pending" }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as RagDocument, ...rows]);
  }
  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Documents" value={String(rows.length)} />
        <Stat label="Uploaded This Month" value={String(rows.filter((row) => new Date(row.created_at).getMonth() === new Date().getMonth()).length)} />
        <Stat label="Categories" value="4" />
        <Stat label="Total Size" value={`${rows.length * 2.4} MB`} />
      </StatGrid>
      <div className="flex gap-3">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document name" />
        <ActionButton onClick={submit}><Upload size={14} className="mr-2" />Upload Document</ActionButton>
      </div>
      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Uploaded By</Th>
                <Th>Date</Th>
                <Th>Size</Th>
                <Th>Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <Td className="font-medium">{row.title ?? "Untitled"}</Td>
                  <Td>{row.source}</Td>
                  <Td>AEON</Td>
                  <Td>{formatShortDate(row.created_at)}</Td>
                  <Td>2.4 MB</Td>
                  <Td><div className="flex gap-2"><GhostButton><Eye size={14} /></GhostButton><GhostButton><Download size={14} /></GhostButton></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function AdminUsersClient({ users }: { users: User[] }) {
  const [rows, setRows] = useState(users);
  const [form, setForm] = useState({ name: "", email: "", role: "employee" });
  async function submit() {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "users", ...form }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as User, ...rows]);
  }
  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total Users" value={String(rows.length)} />
        <Stat label="Active" value={String(rows.filter((row) => row.active).length)} />
        <Stat label="Admins" value={String(rows.filter((row) => row.role === "admin" || row.role === "owner").length)} />
        <Stat label="Last Login" value={timeAgo(rows[0]?.created_at)} />
      </StatGrid>
      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
        <TextInput value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
        <SelectInput value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="employee">employee</option><option value="manager">manager</option><option value="admin">admin</option><option value="owner">owner</option></SelectInput>
        <ActionButton onClick={submit}><Plus size={14} className="mr-2" />Invite User</ActionButton>
      </div>
      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last Active</Th>
                <Th>Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <Td><div className="flex items-center gap-3"><Avatar initials={initials(row.name ?? row.email)} /><span className="font-medium">{row.name ?? row.email}</span></div></Td>
                  <Td>{row.email}</Td>
                  <Td><Badge tone={stageTone(row.role)}>{row.role}</Badge></Td>
                  <Td><Badge tone={row.active ? "success" : "muted"}>{row.active ? "active" : "inactive"}</Badge></Td>
                  <Td>{timeAgo(row.created_at)}</Td>
                  <Td><div className="flex gap-2"><GhostButton><Play size={14} /></GhostButton><GhostButton><Pause size={14} /></GhostButton></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function DialerComplianceClient({ numbers }: { numbers: DncNumber[] }) {
  const [rows, setRows] = useState(numbers);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Manual add");
  const [search, setSearch] = useState("");
  const match = rows.find((row) => row.phone.includes(search));

  async function submit() {
    const res = await fetch("/api/dialer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "dnc", phone, reason }),
    });
    const data = await res.json();
    if (res.ok) setRows([data as DncNumber, ...rows]);
  }

  return (
    <PageSection>
      <StatGrid>
        <Stat label="Total DNC Numbers" value={String(rows.length)} />
        <Stat label="Added This Month" value={String(rows.filter((row) => new Date(row.added_at).getMonth() === new Date().getMonth()).length)} />
        <Stat label="Scrub Checks Run" value="124" />
        <Stat label="Violations Caught" value="7" />
      </StatGrid>
      <SectionCard title="DNC Search">
        <div className="grid gap-3 md:grid-cols-[1fr,auto]">
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Check a phone number" />
          <Badge tone={match ? "destructive" : "success"}>{search ? (match ? "Number blocked" : "Clear to dial") : "Enter number"}</Badge>
        </div>
      </SectionCard>
      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
        <TextInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
        <GhostButton><Upload size={14} className="mr-2" />Upload CSV</GhostButton>
        <ActionButton onClick={submit}><Plus size={14} className="mr-2" />Add Number</ActionButton>
      </div>
      <DataTable>
        <TableShell>
          <table className="min-w-full">
            <TableHeader>
              <tr>
                <Th>Phone</Th>
                <Th>Reason</Th>
                <Th>Date Added</Th>
                <Th>Actions</Th>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <Td className="font-medium">{row.phone}</Td>
                  <Td>{row.reason ?? "Manual add"}</Td>
                  <Td>{formatShortDate(row.added_at)}</Td>
                  <Td><GhostButton onClick={() => setRows(rows.filter((item) => item.id !== row.id))}><Trash2 size={14} /></GhostButton></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </DataTable>
    </PageSection>
  );
}

export function DriveBrowserClient({ docs, connected }: { docs: RagDocument[]; connected: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = docs.filter((doc) => (doc.title ?? "").toLowerCase().includes(search.toLowerCase()));
  return (
    <PageSection>
      <SectionCard title="Google Drive Browser" action={connected ? <Badge tone="success">Connected</Badge> : <ActionButton>Connect Google Drive</ActionButton>}>
        {connected ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="muted">Drive</Badge>
              <Badge tone="muted">AEON / Docs</Badge>
              <Badge tone="muted">Knowledge Base</Badge>
            </div>
            <div className="mt-4">
              <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files" />
            </div>
            <div className="mt-4 space-y-3">
              {filtered.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{doc.title ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{doc.source} · {formatDateTime(doc.created_at)}</div>
                  </div>
                  <GhostButton>Open in Drive</GhostButton>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">Connect Google Drive to browse files here.</div>
        )}
      </SectionCard>
    </PageSection>
  );
}
