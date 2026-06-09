"use client";

import { useEffect, useState } from "react";

interface AgencyStats {
  total_businesses: number;
  total_scored: number;
  total_previews: number;
  total_campaigns: number;
  pipeline_value_low: number;
  pipeline_value_high: number;
  stage_counts: Record<string, number>;
  class_counts: Record<string, number>;
}

function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function AgencyDashboard() {
  const [stats, setStats] = useState<AgencyStats | null>(null);

  useEffect(() => {
    fetch("/api/agency?kind=stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const stages = stats?.stage_counts ?? {};
  const classes = stats?.class_counts ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auto Agency</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autonomous Digital Infrastructure Acquisition Machine
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Businesses Discovered", value: stats?.total_businesses ?? 0 },
          { label: "Scored", value: stats?.total_scored ?? 0 },
          { label: "Previews Generated", value: stats?.total_previews ?? 0 },
          { label: "Active Campaigns", value: stats?.total_campaigns ?? 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-sidebar-border bg-sidebar p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Value */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">Pipeline Value</h2>
        <div className="text-3xl font-bold text-accent">
          {fmtUSD(stats?.pipeline_value_low ?? 0)} – {fmtUSD(stats?.pipeline_value_high ?? 0)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Open opportunities (low – high range)</p>
      </div>

      {/* Stage Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline by Stage</h3>
          <div className="space-y-2">
            {Object.entries(stages).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">{stage}</span>
                <span className="text-sm font-semibold text-foreground">{count}</span>
              </div>
            ))}
            {Object.keys(stages).length === 0 && (
              <p className="text-xs text-muted-foreground">No opportunities yet</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Score Classifications</h3>
          <div className="space-y-2">
            {["INVISIBLE", "WEAK", "AVERAGE", "STRONG", "ADVANCED"].map((cls) => (
              <div key={cls} className="flex items-center justify-between">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  cls === "INVISIBLE" ? "bg-red-500/10 text-red-400" :
                  cls === "WEAK" ? "bg-orange-500/10 text-orange-400" :
                  cls === "AVERAGE" ? "bg-yellow-500/10 text-yellow-400" :
                  cls === "STRONG" ? "bg-blue-500/10 text-blue-400" :
                  "bg-emerald-500/10 text-emerald-400"
                }`}>{cls}</span>
                <span className="text-sm font-semibold text-foreground">{classes[cls] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* n8n Workflow Triggers */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">n8n Automation Hooks</h3>
        <p className="text-xs text-muted-foreground mb-3">These events fire to n8n when pipeline actions occur:</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { hook: "aeon/agency/business-discovered", desc: "New business added" },
            { hook: "aeon/agency/business-scored", desc: "Score calculated" },
            { hook: "aeon/agency/preview-generated", desc: "Preview URL created" },
            { hook: "aeon/agency/email-sent", desc: "Outreach email dispatched" },
            { hook: "aeon/agency/reply-received", desc: "Prospect replied" },
            { hook: "aeon/agency/stage-changed", desc: "Pipeline stage moved" },
            { hook: "aeon/agency/call-booked", desc: "Appointment scheduled" },
            { hook: "aeon/agency/deal-won", desc: "Deal closed" },
            { hook: "aeon/agency/fulfillment-started", desc: "Project kicked off" },
          ].map((item) => (
            <div key={item.hook} className="p-2 rounded-lg bg-background/50 border border-sidebar-border/50">
              <code className="text-[10px] text-accent font-mono block break-all">{item.hook}</code>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Businesses List ─────────────────────────────────────────────────────────

interface Business {
  id: string; business_name: string; category: string | null;
  city: string | null; state: string | null;
  website: string | null; rating: number | null; review_count: number;
  source: string | null; created_at: string;
}

export function AgencyBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency?kind=businesses")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setBusinesses(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discovered Businesses</h1>
          <p className="text-sm text-muted-foreground mt-1">Scraped from Google Places + imported lead inventory</p>
        </div>
        <span className="text-sm text-muted-foreground">{businesses.length} total</span>
      </div>

      <div className="rounded-xl border border-sidebar-border bg-sidebar overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sidebar-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Reviews</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!loading && businesses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No businesses discovered yet. Import leads or run Google Places discovery.</td></tr>
            )}
            {businesses.map((biz) => (
              <tr key={biz.id} className="border-b border-sidebar-border/50 hover:bg-sidebar-accent/30">
                <td className="px-4 py-3 font-medium text-foreground">{biz.business_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{biz.category ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{biz.city}{biz.state ? `, ${biz.state}` : ""}</td>
                <td className="px-4 py-3 text-foreground">{biz.rating ?? "—"}</td>
                <td className="px-4 py-3 text-foreground">{biz.review_count}</td>
                <td className="px-4 py-3">{biz.website ? <span className="text-accent text-xs">Has site</span> : <span className="text-red-400 text-xs">None</span>}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{biz.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string; business_id: string; stage: string;
  opportunity_type: string | null; recommended_offer: string | null;
  revenue_low_cents: number | null; revenue_high_cents: number | null;
  priority_score: number; created_at: string;
}

export function AgencyPipeline() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency?kind=pipeline")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setOpps(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stageOrder = ["DISCOVERED","SCORED","PREVIEW_GENERATED","EMAIL_SENT","OPENED","CLICKED","REPLIED","CALL_BOOKED","PROPOSAL_SENT","WON","LOST","CLIENT","RETAINER"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agency Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">DISCOVERED → SCORED → PREVIEW → OUTREACH → CLOSE → FULFILL → RETAIN</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : opps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar/50 p-8 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold text-foreground">Pipeline Empty</h3>
          <p className="text-sm text-muted-foreground mt-1">Discover businesses and run the scoring engine to populate the pipeline.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {stageOrder.map((stage) => {
            const stageOpps = opps.filter((o) => o.stage === stage);
            if (stageOpps.length === 0) return null;
            return (
              <div key={stage} className="rounded-xl border border-sidebar-border bg-sidebar p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stage.replace(/_/g, " ")}</span>
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{stageOpps.length}</span>
                </div>
                <div className="space-y-2">
                  {stageOpps.slice(0, 5).map((o) => (
                    <div key={o.id} className="p-2 rounded-lg bg-background/50 border border-sidebar-border/50">
                      <div className="text-xs font-medium text-foreground">{o.opportunity_type?.replace(/_/g, " ") ?? "Unclassified"}</div>
                      {o.recommended_offer && <div className="text-[10px] text-muted-foreground mt-0.5">{o.recommended_offer}</div>}
                      {o.revenue_high_cents && <div className="text-[10px] text-accent mt-0.5">Up to {fmtUSD(o.revenue_high_cents)}</div>}
                    </div>
                  ))}
                  {stageOpps.length > 5 && <p className="text-[10px] text-muted-foreground">+{stageOpps.length - 5} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Previews ────────────────────────────────────────────────────────────────

interface Preview {
  id: string; slug: string; preview_url: string;
  template_used: string | null; visits: number; cta_clicks: number;
  status: string; created_at: string;
}

export function AgencyPreviews() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency?kind=previews")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setPreviews(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generated Previews</h1>
        <p className="text-sm text-muted-foreground mt-1">Web Gen Worker output — premium previews deployed to preview.snrglabs.com</p>
      </div>
      {loading ? <p className="text-muted-foreground">Loading...</p> : previews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar/50 p-8 text-center">
          <div className="text-4xl mb-3">🌐</div>
          <h3 className="text-lg font-semibold text-foreground">No Previews Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Score businesses and generate previews via the Web Gen Worker.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previews.map((p) => (
            <div key={p.id} className="rounded-xl border border-sidebar-border bg-sidebar p-4 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs text-accent font-mono">{p.slug}</code>
                <span className={`text-[10px] px-2 py-0.5 rounded ${p.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>{p.status}</span>
              </div>
              {p.template_used && <div className="text-xs text-muted-foreground">Template: {p.template_used}</div>}
              <div className="flex gap-4 text-xs">
                <span className="text-muted-foreground">Visits: <span className="text-foreground font-medium">{p.visits}</span></span>
                <span className="text-muted-foreground">CTA Clicks: <span className="text-foreground font-medium">{p.cta_clicks}</span></span>
              </div>
              <a href={p.preview_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline block truncate">{p.preview_url}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

interface Campaign {
  id: string; name: string; niche: string | null; city: string | null;
  status: string; total_sent: number; total_opens: number;
  total_clicks: number; total_replies: number; warmup_day: number;
}

export function AgencyCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency?kind=campaigns")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCampaigns(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Outreach Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">Cold outbound via Instantly/Smartlead — personalized sequences</p>
      </div>
      {loading ? <p className="text-muted-foreground">Loading...</p> : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar/50 p-8 text-center">
          <div className="text-4xl mb-3">📧</div>
          <h3 className="text-lg font-semibold text-foreground">No Campaigns</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a campaign after scoring and generating previews for qualified leads.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-sidebar-border bg-sidebar p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{c.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>{c.status}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.niche}{c.city ? ` — ${c.city}` : ""}</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><div className="text-lg font-bold text-foreground">{c.total_sent}</div><div className="text-[10px] text-muted-foreground">Sent</div></div>
                <div><div className="text-lg font-bold text-foreground">{c.total_opens}</div><div className="text-[10px] text-muted-foreground">Opens</div></div>
                <div><div className="text-lg font-bold text-foreground">{c.total_clicks}</div><div className="text-[10px] text-muted-foreground">Clicks</div></div>
                <div><div className="text-lg font-bold text-foreground">{c.total_replies}</div><div className="text-[10px] text-muted-foreground">Replies</div></div>
              </div>
              <div className="text-[10px] text-muted-foreground">Warmup day: {c.warmup_day}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agents ──────────────────────────────────────────────────────────────────

interface AgentLog {
  id: string; agent_name: string; action: string;
  target_type: string | null; logged_at: string;
}

export function AgencyAgents() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency?kind=agents")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setLogs(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agents = ["CEO", "Sales", "Ops", "Estimating", "Fulfillment", "Client Success"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Autonomous Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">CEO Agent → Sales → Ops → Estimating → Fulfillment → Client Success</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent} className="rounded-xl border border-sidebar-border bg-sidebar p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <h3 className="font-semibold text-foreground text-sm">{agent} Agent</h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {logs.filter((l) => l.agent_name.toLowerCase().includes(agent.toLowerCase())).length} actions logged
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
        {loading ? <p className="text-xs text-muted-foreground">Loading...</p> : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No agent activity yet. Agents log actions as n8n workflows execute.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                <span className="text-[10px] font-mono text-accent w-24 shrink-0">{log.agent_name}</span>
                <span className="text-xs text-foreground">{log.action}</span>
                {log.target_type && <span className="text-[10px] text-muted-foreground ml-auto">{log.target_type}</span>}
                <span className="text-[10px] text-muted-foreground">{new Date(log.logged_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scoring View ────────────────────────────────────────────────────────────

export function AgencyScoring() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Digital Maturity Scoring</h1>
        <p className="text-sm text-muted-foreground mt-1">0–100 Infrastructure Score — classify and prioritize targets</p>
      </div>
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Scoring Criteria</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { criterion: "Website exists", pts: 15 },
            { criterion: "Mobile-friendly", pts: 10 },
            { criterion: "Page speed (CWV)", pts: 10 },
            { criterion: "Clear CTA above fold", pts: 10 },
            { criterion: "Contact/booking form", pts: 10 },
            { criterion: "Reviews displayed onsite", pts: 10 },
            { criterion: "Service pages present", pts: 10 },
            { criterion: "Tracking pixel detected", pts: 5 },
            { criterion: "CRM/funnel indicators", pts: 5 },
            { criterion: "Email/SMS capture", pts: 5 },
            { criterion: "Modern design quality", pts: 5 },
            { criterion: "Analytics detected", pts: 5 },
          ].map((c) => (
            <div key={c.criterion} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
              <span className="text-xs text-foreground">{c.criterion}</span>
              <span className="text-xs font-bold text-accent">{c.pts}pts</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Classifications</h2>
        <div className="space-y-2">
          {[
            { cls: "INVISIBLE", range: "0–20", color: "text-red-400 bg-red-500/10" },
            { cls: "WEAK", range: "21–40", color: "text-orange-400 bg-orange-500/10" },
            { cls: "AVERAGE", range: "41–60", color: "text-yellow-400 bg-yellow-500/10" },
            { cls: "STRONG", range: "61–80", color: "text-blue-400 bg-blue-500/10" },
            { cls: "ADVANCED", range: "81–100", color: "text-emerald-400 bg-emerald-500/10" },
          ].map((c) => (
            <div key={c.cls} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${c.color}`}>{c.cls}</span>
              <span className="text-xs text-muted-foreground">{c.range} points</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Fulfillment ─────────────────────────────────────────────────────────────

export function AgencyFulfillment() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fulfillment</h1>
        <p className="text-sm text-muted-foreground mt-1">Post-close project management — task templates by package type</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">Website Package Tasks</h3>
          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            <li>Confirm business details + domain</li>
            <li>Confirm logo/assets</li>
            <li>Finalize copy and colors</li>
            <li>Connect contact form + analytics</li>
            <li>Connect Google Business link</li>
            <li>Mobile QA (44px law)</li>
            <li>Launch checklist</li>
            <li>Handoff email + training</li>
          </ol>
        </div>
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">Growth Infrastructure Tasks</h3>
          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            <li>CRM account + pipeline setup</li>
            <li>Forms + calendar setup</li>
            <li>SMS number provisioning</li>
            <li>Missed-call text-back</li>
            <li>Review automation</li>
            <li>Lead notification system</li>
            <li>Dashboard configuration</li>
            <li>Training session</li>
            <li>30-day optimization</li>
          </ol>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">Active projects will appear here when deals close and the onboarding workflow fires via n8n.</p>
      </div>
    </div>
  );
}
