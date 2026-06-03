"use client";
import type { LucideIcon } from "lucide-react";
import { CircleDollarSign, Clock3, Target, TrendingUp, UsersRound } from "lucide-react";
import { fmtUSD } from "@/lib/db/money";
import type { Deal } from "@/types/models";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from "recharts";

const STAGE_COLORS: Record<string, string> = {
  lead: "#8A7A6A",
  qualified: "#C45F24",
  proposal: "#E87B2E",
  negotiation: "#F0A15F",
  won: "#5DBF7A",
};

function MetricCard({ title, value, icon: Icon }: {
  title: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-card border border-border rounded-xl group relative overflow-hidden p-5 transition-colors hover:border-accent/50">
      <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-accent/10">
            <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent" />
          </div>
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{value}</span>
      </div>
    </div>
  );
}

export function SalesClient({ funnel, deals, wonCents, pipelineCents }: {
  funnel: { stage: string; count: number; value: number }[];
  deals: Deal[];
  wonCents: number; pipelineCents: number;
}) {
  const totalDeals = funnel.reduce((a, f) => a + f.count, 0);
  const wonDeals = funnel.find((f) => f.stage === "won")?.count ?? 0;
  const leadDeals = funnel.find((f) => f.stage === "lead")?.count ?? 0;
  const activeDeals = totalDeals - wonDeals;
  const conv = totalDeals ? Math.round((wonDeals / totalDeals) * 100) : 0;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Pipeline Value" value={fmtUSD(pipelineCents)} icon={CircleDollarSign} />
        <MetricCard title="Won Revenue" value={fmtUSD(wonCents)} icon={TrendingUp} />
        <MetricCard title="Active Deals" value={String(activeDeals)} icon={Target} />
        <MetricCard title="New Leads" value={String(leadDeals)} icon={UsersRound} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-card border border-border rounded-xl h-[380px] p-5 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Deal Value by Stage</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Live CRM pipeline distribution</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2218" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: "#8A7A6A", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A7A6A", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(232,123,46,0.06)" }} contentStyle={{ background: "#18140F", border: "1px solid #2A2218", borderRadius: 8, color: "#F2E8D9" }} formatter={(v: number) => fmtUSD(Math.round(v * 100))} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnel.map((f) => <Cell key={f.stage} fill={STAGE_COLORS[f.stage]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl h-[380px] p-5">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Pipeline Stages</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Distribution by stage</p>
          </div>
          <div className="space-y-5">
            {funnel.map((f) => {
              const pct = totalDeals ? Math.round((f.count / totalDeals) * 100) : 0;
              return (
                <div key={f.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-foreground">{f.stage}</span>
                    <span className="text-muted-foreground">{f.count} <span className="font-semibold text-foreground">{pct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[f.stage] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-foreground">Recent Deals</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Latest CRM activity</p>
          </div>
          <div className="space-y-3">
            {deals.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No deals yet.</div>}
            {deals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-secondary">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-muted-foreground">{deal.title.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{deal.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{deal.stage}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{fmtUSD(deal.value_cents)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-foreground">Conversion Snapshot</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Current pipeline performance</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Total Deals" value={String(totalDeals)} icon={Target} />
            <MetricCard title="Win Rate" value={`${conv}%`} icon={TrendingUp} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Calculated from live CRM deal stages
          </div>
        </div>
      </div>
    </div>
  );
}
