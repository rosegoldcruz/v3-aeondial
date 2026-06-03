import { Trophy } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Avatar, Badge, ProgressBar, Row, Stat } from "@/components/ui/primitives";
import { BarMetricChart, LineMetricChart, RevenueAreaChart } from "@/components/pages/charts";
import { DataTable, GridHalves, GridTwo, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatDate, initials, money, stageTone, timeAgo } from "@/lib/ui/format";

export async function SalesOverviewView() {
  const data = await requireWorkspaceData();
  const wonRevenue = data.deals.filter((deal) => deal.stage === "won").reduce((sum, deal) => sum + Number(deal.value_cents), 0);
  const conversion = Math.round((data.deals.filter((deal) => deal.stage === "won").length / Math.max(1, data.leads.length)) * 100);
  const activeDeals = data.deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const performers = topPerformers(data.deals);
  const recentDeals = data.deals.slice(0, 5);
  const trend = last8WeeksRevenue(data.deals);
  const stages = ["lead", "qualified", "proposal", "negotiation"].map((stage) => ({
    stage,
    deals: activeDeals.filter((deal) => deal.stage === stage),
  }));

  return (
    <>
      <Topbar title="Sales Overview" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Revenue" value={money(wonRevenue)} delta={{ value: "+12.4%", dir: "up" }} tone="up" />
          <Stat label="Conversion Rate" value={`${conversion}%`} delta={{ value: "+4.2%", dir: "up" }} tone="up" />
          <Stat label="Active Deals" value={String(activeDeals.length)} delta={{ value: "+2.1%", dir: "up" }} tone="flat" />
          <Stat label="New Leads" value={String(data.leads.filter((lead) => Date.now() - new Date(lead.created_at).getTime() < 30 * 86400000).length)} delta={{ value: "-1.3%", dir: "down" }} tone="down" />
        </StatGrid>

        <GridTwo
          left={
            <SectionCard title="Revenue Trend">
              <RevenueAreaChart data={trend.map((item) => ({ label: item.label, value: item.value, target: item.target }))} />
            </SectionCard>
          }
          right={
            <SectionCard title="Pipeline Stages">
              <div className="space-y-4">
                {stages.map((entry, index) => {
                  const total = entry.deals.reduce((sum, deal) => sum + Number(deal.value_cents), 0);
                  const share = Math.round((entry.deals.length / Math.max(1, activeDeals.length)) * 100);
                  return (
                    <div key={entry.stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-foreground">{entry.stage}</span>
                        <span className="text-muted-foreground">{entry.deals.length} · {money(total)}</span>
                      </div>
                      <ProgressBar value={share} color={index % 2 === 0 ? "bg-chart-1" : "bg-chart-2"} delay={index * 100} />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          }
        />

        <GridHalves
          left={
            <SectionCard title="Recent Deals">
              <div className="space-y-1">
                {recentDeals.map((deal, index) => (
                  <Row key={deal.id} delay={index * 50}>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(deal.contact_name ?? deal.title)} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{deal.contact_name ?? deal.title}</div>
                        <div className="text-xs text-muted-foreground">{deal.owner_name ?? "Unassigned"} · {deal.title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-accent">{money(deal.value_cents)}</div>
                      <Badge tone={stageTone(deal.stage)}>{deal.stage}</Badge>
                    </div>
                  </Row>
                ))}
              </div>
            </SectionCard>
          }
          right={
            <SectionCard title="Top Performers">
              <div className="space-y-1">
                {performers.map((performer, index) => (
                  <Row key={performer.name} delay={index * 50}>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(performer.name)} gradient />
                      <div>
                        <div className="text-sm font-medium text-foreground">{performer.name}</div>
                        <div className="text-xs text-muted-foreground">{performer.deals} deals · {performer.winRate}% win rate</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={index === 0 ? "success" : "muted"}>#{index + 1}</Badge>
                      <div className="text-sm font-semibold text-accent">{money(performer.revenue)}</div>
                    </div>
                  </Row>
                ))}
              </div>
            </SectionCard>
          }
        />
      </PageSection>
    </>
  );
}

export async function SalesForecastsView() {
  const data = await requireWorkspaceData();
  const reps = forecastRows(data.deals);
  const quota = reps.reduce((sum, rep) => sum + rep.quota, 0);
  const closed = reps.reduce((sum, rep) => sum + rep.closed, 0);
  const projected = reps.reduce((sum, rep) => sum + rep.projected, 0);
  const attainment = quota ? Math.round((closed / quota) * 100) : 0;

  return (
    <>
      <Topbar title="Forecasts" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Quota" value={money(quota)} />
          <Stat label="Attainment %" value={`${attainment}%`} />
          <Stat label="Projected Close" value={money(projected)} />
          <Stat label="Gap to Quota" value={money(Math.max(0, quota - projected))} />
        </StatGrid>
        <SectionCard title="Quota vs Attainment by Rep">
          <BarMetricChart data={reps.map((rep) => ({ label: rep.name.split(" ")[0], quota: rep.quota / 100, closed: rep.closed / 100 }))} bars={[{ key: "quota", color: "oklch(0.7 0.18 220)", name: "Quota" }, { key: "closed", color: "oklch(0.7 0.18 145)", name: "Closed" }]} />
        </SectionCard>
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Rep Name</Th>
                  <Th>Quota</Th>
                  <Th>Closed</Th>
                  <Th>Pipeline</Th>
                  <Th>Projected</Th>
                  <Th>% Attainment</Th>
                </tr>
              </TableHeader>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.name} className="border-t border-border">
                    <Td className="font-medium">{rep.name}</Td>
                    <Td>{money(rep.quota)}</Td>
                    <Td>{money(rep.closed)}</Td>
                    <Td>{money(rep.pipeline)}</Td>
                    <Td>{money(rep.projected)}</Td>
                    <Td>
                      <div className="space-y-2">
                        <div className="text-sm text-foreground">{rep.attainment}%</div>
                        <ProgressBar value={rep.attainment} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </DataTable>
      </PageSection>
    </>
  );
}

export async function SalesReportsView() {
  const data = await requireWorkspaceData();
  const monthly = last12Months(data.deals);
  const closedThisMonth = data.deals.filter((deal) => deal.stage === "won" && new Date(deal.updated_at).getMonth() === new Date().getMonth());

  return (
    <>
      <Topbar title="Reports" right={null} />
      <PageSection>
        <GridHalves
          left={
            <SectionCard title="Revenue Trend">
              <LineMetricChart data={monthly.map((item) => ({ label: item.label, revenue: item.revenue / 100 }))} lines={[{ key: "revenue", color: "oklch(0.7 0.18 220)", name: "Revenue" }]} />
            </SectionCard>
          }
          right={
            <SectionCard title="Win / Loss Ratio">
              <BarMetricChart data={monthly.map((item) => ({ label: item.label, won: item.won, lost: item.lost }))} bars={[{ key: "won", color: "oklch(0.7 0.18 145)", name: "Won" }, { key: "lost", color: "oklch(0.65 0.22 25)", name: "Lost" }]} />
            </SectionCard>
          }
        />
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Deal</Th>
                  <Th>Value</Th>
                  <Th>Rep</Th>
                  <Th>Contact</Th>
                </tr>
              </TableHeader>
              <tbody>
                {closedThisMonth.map((deal) => (
                  <tr key={deal.id} className="border-t border-border">
                    <Td className="font-medium">{deal.title}</Td>
                    <Td className="text-accent">{money(deal.value_cents)}</Td>
                    <Td>{deal.owner_name ?? "Open queue"}</Td>
                    <Td>{deal.contact_name ?? "No contact"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </DataTable>
      </PageSection>
    </>
  );
}

export async function SalesTeamView() {
  const data = await requireWorkspaceData();
  const reps = forecastRows(data.deals);
  const topRevenue = Math.max(...reps.map((rep) => rep.revenue), 0);

  return (
    <>
      <Topbar title="Sales Team" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Reps" value={String(reps.length)} />
          <Stat label="Active" value={String(reps.filter((rep) => rep.deals > 0).length)} />
          <Stat label="Avg Deals" value={String(reps.length ? Math.round(reps.reduce((sum, rep) => sum + rep.deals, 0) / reps.length) : 0)} />
          <Stat label="Total Revenue" value={money(reps.reduce((sum, rep) => sum + rep.revenue, 0))} />
        </StatGrid>
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Rep</Th>
                  <Th>Email</Th>
                  <Th>Deals Closed</Th>
                  <Th>Revenue</Th>
                  <Th>Win Rate %</Th>
                  <Th>Last Activity</Th>
                </tr>
              </TableHeader>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.name} className="border-t border-border">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={initials(rep.name)} />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rep.name}</span>
                          {rep.revenue === topRevenue ? <Trophy size={14} className="text-warning" /> : null}
                        </div>
                      </div>
                    </Td>
                    <Td>{rep.email}</Td>
                    <Td>{rep.wonDeals}</Td>
                    <Td className="text-accent">{money(rep.revenue)}</Td>
                    <Td>{rep.winRate}%</Td>
                    <Td>{timeAgo(rep.lastActivity)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </DataTable>
      </PageSection>
    </>
  );
}

function topPerformers(deals: Awaited<ReturnType<typeof requireWorkspaceData>>["deals"]) {
  return forecastRows(deals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((rep) => ({ name: rep.name, deals: rep.wonDeals, revenue: rep.revenue, winRate: rep.winRate }));
}

function forecastRows(deals: Awaited<ReturnType<typeof requireWorkspaceData>>["deals"]) {
  const owners = new Map<string, { name: string; email: string; quota: number; closed: number; pipeline: number; projected: number; attainment: number; deals: number; wonDeals: number; revenue: number; winRate: number; lastActivity: string }>();
  for (const deal of deals) {
    const key = deal.owner_name ?? "Open Queue";
    const current = owners.get(key) ?? {
      name: key,
      email: `${key.toLowerCase().replace(/\s+/g, ".")}@aeondial.com`,
      quota: 2400000,
      closed: 0,
      pipeline: 0,
      projected: 0,
      attainment: 0,
      deals: 0,
      wonDeals: 0,
      revenue: 0,
      winRate: 0,
      lastActivity: deal.updated_at,
    };
    current.deals += 1;
    current.lastActivity = current.lastActivity > deal.updated_at ? current.lastActivity : deal.updated_at;
    if (deal.stage === "won") {
      current.closed += Number(deal.value_cents);
      current.wonDeals += 1;
      current.revenue += Number(deal.value_cents);
    } else if (deal.stage !== "lost") {
      current.pipeline += Number(deal.value_cents);
      current.projected += Math.round(Number(deal.value_cents) * (probability(deal.stage) / 100));
    }
    owners.set(key, current);
  }
  return [...owners.values()].map((row) => ({
    ...row,
    attainment: row.quota ? Math.round((row.closed / row.quota) * 100) : 0,
    winRate: row.deals ? Math.round((row.wonDeals / row.deals) * 100) : 0,
  }));
}

function probability(stage: string) {
  if (stage === "lead") return 20;
  if (stage === "qualified") return 45;
  if (stage === "proposal") return 65;
  if (stage === "negotiation") return 80;
  if (stage === "won") return 100;
  return 0;
}

function last8WeeksRevenue(deals: Awaited<ReturnType<typeof requireWorkspaceData>>["deals"]) {
  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date();
    start.setDate(start.getDate() - (7 * (7 - index)));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const selected = deals.filter((deal) => {
      const date = new Date(deal.updated_at);
      return date >= start && date <= end && deal.stage === "won";
    });
    const value = selected.reduce((sum, deal) => sum + Number(deal.value_cents), 0) / 100;
    return { label: `W${index + 1}`, value, target: Math.round(value * 0.88) };
  });
}

function last12Months(deals: Awaited<ReturnType<typeof requireWorkspaceData>>["deals"]) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthDeals = deals.filter((deal) => {
      const updated = new Date(deal.updated_at);
      return updated.getMonth() === month && updated.getFullYear() === year;
    });
    return {
      label: date.toLocaleString("en-US", { month: "short" }),
      revenue: monthDeals.filter((deal) => deal.stage === "won").reduce((sum, deal) => sum + Number(deal.value_cents), 0),
      won: monthDeals.filter((deal) => deal.stage === "won").length,
      lost: monthDeals.filter((deal) => deal.stage === "lost").length,
    };
  });
}
