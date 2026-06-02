"use client";
import { Stat, Card, SectionTitle } from "@/components/ui/primitives";
import { fmtUSD } from "@/lib/db/money";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export function SalesClient({ funnel, wonCents, pipelineCents }: {
  funnel: { stage: string; count: number; value: number }[];
  wonCents: number; pipelineCents: number;
}) {
  const totalDeals = funnel.reduce((a, f) => a + f.count, 0);
  const conv = totalDeals ? Math.round(((funnel.find(f=>f.stage==="won")?.count ?? 0) / totalDeals) * 100) : 0;
  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Pipeline" value={fmtUSD(pipelineCents)} tone="ember" />
        <Stat label="Won" value={fmtUSD(wonCents)} tone="gain" />
        <Stat label="Total Deals" value={String(totalDeals)} />
        <Stat label="Win Rate" value={`${conv}%`} tone={conv >= 30 ? "gain" : "ink"} />
      </div>
      <Card>
        <SectionTitle>Deal Value by Stage</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel}>
              <XAxis dataKey="stage" tick={{ fill: "#8A7A6A", fontSize: 11 }} axisLine={{ stroke: "#2A2218" }} tickLine={false} />
              <YAxis tick={{ fill: "#8A7A6A", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(232,123,46,0.06)" }}
                contentStyle={{ background: "#18140F", border: "1px solid #2A2218", borderRadius: 8, color: "#F2E8D9" }}
                formatter={(v: number) => fmtUSD(Math.round(v * 100))}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {funnel.map((f, i) => (
                  <Cell key={i} fill={f.stage === "won" ? "#5DBF7A" : "#E87B2E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <SectionTitle>Funnel Counts</SectionTitle>
        <div className="grid grid-cols-5 gap-2">
          {funnel.map((f) => (
            <div key={f.stage} className="text-center">
              <div className="text-2xl font-medium text-ember">{f.count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">{f.stage}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
