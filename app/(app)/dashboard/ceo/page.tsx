import { getOrgId } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { query, one } from "@/lib/db/pool";
import { listAiInsights } from "@/lib/enterprise/core";

export const dynamic = "force-dynamic";

function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function CEOCommandCenter() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [metrics, pipeline, leads, deals, calls, tasks, risks, insights] = await Promise.all([
    one<{ revenue_cents: number; pipeline_cents: number; new_leads: number; new_deals: number; closed_deals: number; calls_made: number; emails_sent: number; appointments: number }>(
      `SELECT COALESCE(SUM(revenue_cents),0)::int as revenue_cents,
        COALESCE(SUM(pipeline_cents),0)::int as pipeline_cents,
        COALESCE(SUM(new_leads),0)::int as new_leads,
        COALESCE(SUM(new_deals),0)::int as new_deals,
        COALESCE(SUM(closed_deals),0)::int as closed_deals,
        COALESCE(SUM(calls_made),0)::int as calls_made,
        COALESCE(SUM(emails_sent),0)::int as emails_sent,
        COALESCE(SUM(appointments),0)::int as appointments
       FROM ceo_metrics WHERE org_id=$1 AND metric_date=$2`,
      [orgId, today]
    ),
    one<{ total: number; weighted: number }>(
      `SELECT COALESCE(SUM(value_cents),0)::int as total,
        COALESCE(SUM(value_cents * probability / 100),0)::int as weighted
       FROM deals WHERE org_id=$1 AND status NOT IN ('closed_won','closed_lost')`,
      [orgId]
    ),
    one<{ total: number; hot: number; stale: number }>(
      `SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status='hot')::int as hot,
        COUNT(*) FILTER (WHERE last_contact_at < now() - interval '7 days' OR last_contact_at IS NULL)::int as stale
       FROM leads WHERE org_id=$1 AND status NOT IN ('converted','lost','dnc')`,
      [orgId]
    ),
    one<{ total: number; overdue: number; at_risk: number }>(
      `SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE close_date < now() AND status NOT IN ('closed_won','closed_lost'))::int as overdue,
        COUNT(*) FILTER (WHERE status='at_risk')::int as at_risk
       FROM deals WHERE org_id=$1`,
      [orgId]
    ),
    one<{ total: number; completed: number; duration: number }>(
      `SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status='completed')::int as completed,
        COALESCE(SUM(duration_s),0)::int as duration
       FROM calls WHERE org_id=$1 AND created_at > now() - interval '24 hours'`,
      [orgId]
    ),
    one<{ total: number; overdue: number; completed: number }>(
      `SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE due_at < now() AND status != 'completed')::int as overdue,
        COUNT(*) FILTER (WHERE status='completed')::int as completed
       FROM project_tasks WHERE org_id=$1`,
      [orgId]
    ),
    query<{ id: string; alert_type: string; severity: string; title: string; description: string | null; created_at: string }>(
      "SELECT id, alert_type, severity, title, description, created_at FROM risk_alerts WHERE org_id=$1 AND dismissed=false ORDER BY created_at DESC LIMIT 10",
      [orgId]
    ),
    listAiInsights(orgId, undefined, 10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executive Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time intelligence on what is making money, what is blocked, and what needs attention</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue Today", value: fmtUSD(metrics?.revenue_cents ?? 0), color: "text-emerald-400" },
          { label: "Pipeline", value: fmtUSD(pipeline?.total ?? 0), sub: `Weighted: ${fmtUSD(pipeline?.weighted ?? 0)}`, color: "text-blue-400" },
          { label: "New Leads", value: String(metrics?.new_leads ?? 0), color: "text-accent" },
          { label: "Closed Deals", value: String(metrics?.closed_deals ?? 0), color: "text-emerald-400" },
          { label: "Calls Today", value: String(calls?.total ?? 0), sub: `${Math.floor((calls?.duration ?? 0) / 60)}m talk time`, color: "text-yellow-400" },
          { label: "Emails Sent", value: String(metrics?.emails_sent ?? 0), color: "text-purple-400" },
          { label: "Appointments", value: String(metrics?.appointments ?? 0), color: "text-pink-400" },
          { label: "Active Deals", value: String(deals?.total ?? 0), sub: `${deals?.overdue ?? 0} overdue`, color: "text-orange-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-sidebar-border bg-sidebar p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</div>
            <div className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
            {kpi.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Risk Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Risk Alerts</h3>
          <div className="space-y-2">
            {risks.length === 0 && <p className="text-xs text-muted-foreground">No active risk alerts</p>}
            {risks.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${
                r.severity === "critical" ? "border-red-500/40 bg-red-500/10" :
                r.severity === "high" ? "border-orange-500/40 bg-orange-500/10" :
                "border-yellow-500/40 bg-yellow-500/10"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{r.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                    r.severity === "critical" ? "bg-red-500/20 text-red-400" :
                    r.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{r.severity}</span>
                </div>
                {r.description && <p className="text-[10px] text-muted-foreground mt-1">{r.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">AEON Intelligence</h3>
          <div className="space-y-2">
            {insights.length === 0 && <p className="text-xs text-muted-foreground">No insights yet</p>}
            {insights.map((ins) => (
              <div key={ins.id} className="p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{ins.title}</span>
                  {ins.confidence && <span className="text-[10px] text-accent">{Math.round(ins.confidence * 100)}% confidence</span>}
                </div>
                {ins.description && <p className="text-[10px] text-muted-foreground mt-1">{ins.description}</p>}
                {ins.value_cents && ins.value_cents > 0 && <p className="text-[10px] text-emerald-400 mt-0.5">Est. value: {fmtUSD(ins.value_cents)}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Health */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Lead Health</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-background/50">
            <div className="text-3xl font-bold text-foreground">{leads?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Active Leads</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-500/10">
            <div className="text-3xl font-bold text-emerald-400">{leads?.hot ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Hot Leads</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-500/10">
            <div className="text-3xl font-bold text-red-400">{leads?.stale ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Stale (7+ days)</div>
          </div>
        </div>
      </div>

      {/* Task Overview */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Operations — Tasks</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-background/50">
            <div className="text-3xl font-bold text-foreground">{tasks?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Tasks</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-500/10">
            <div className="text-3xl font-bold text-emerald-400">{tasks?.completed ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-500/10">
            <div className="text-3xl font-bold text-red-400">{tasks?.overdue ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Overdue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
