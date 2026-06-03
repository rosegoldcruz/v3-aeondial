import { Topbar } from "@/components/shell/topbar";
import { Badge, ProgressBar, Row, Stat } from "@/components/ui/primitives";
import { LineMetricChart } from "@/components/pages/charts";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { FinanceLedgerClient, FinanceSubscriptionsClient } from "@/components/pages/workbench-clients";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatShortDate, money } from "@/lib/ui/format";

export async function FinanceDashboardView() {
  const data = await requireWorkspaceData();
  const entities = data.entities;
  const selected = entities[0];
  const subs = data.subscriptions.filter((sub) => sub.entity_id === selected?.id);
  const txns = data.transactions.filter((txn) => txn.entity_id === selected?.id);
  const monthlyTrend = last6Months(txns);

  return (
    <>
      <Topbar title="Finance Overview" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="All-Entity Monthly Burn" value={money(data.subscriptions.filter((sub) => sub.active).reduce((sum, sub) => sum + sub.amount_cents, 0))} />
          <Stat label="SNRG Labs Burn" value={money(totalForEntity(data.subscriptions, "SNRG Labs"))} />
          <Stat label="Vulpine Homes Burn" value={money(totalForEntity(data.subscriptions, "Vulpine Homes"))} />
          <Stat label="Net Position" value={money(data.transactions.reduce((sum, txn) => sum + (txn.type === "in" ? txn.amount_cents : -txn.amount_cents), 0))} />
        </StatGrid>
        <div className="flex flex-wrap gap-2">
          {entities.map((entity, index) => <Badge key={entity.id} tone={index === 0 ? "accent" : "muted"}>{entity.name}</Badge>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <SectionCard title={`Spend by Category · ${selected?.name ?? "Entity"}`}>
            <div className="space-y-4">
              {groupByCategory(subs).map((row, index) => (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <span className="text-muted-foreground">{money(row.value)}</span>
                  </div>
                  <ProgressBar value={row.share} color={index % 2 === 0 ? "bg-chart-1" : "bg-chart-2"} />
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Monthly Spend Trend">
            <LineMetricChart data={monthlyTrend.map((row) => ({ label: row.label, spend: row.value / 100 }))} lines={[{ key: "spend", color: "oklch(0.7 0.18 220)", name: "Spend" }]} />
          </SectionCard>
        </div>
        <SectionCard title="Recent Transactions">
          <div className="space-y-1">
            {txns.slice(0, 6).map((txn, index) => (
              <Row key={txn.id} delay={index * 40}>
                <div>
                  <div className="text-sm font-medium text-foreground">{txn.description}</div>
                  <div className="text-xs text-muted-foreground">{txn.category} · {formatShortDate(txn.occurred_on)}</div>
                </div>
                <div className={`text-sm font-semibold ${txn.type === "in" ? "text-success" : "text-destructive"}`}>{money(txn.amount_cents)}</div>
              </Row>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function FinanceLedgerView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Ledger" right={null} />
      <FinanceLedgerClient transactions={data.transactions} entities={data.entities} />
    </>
  );
}

export async function FinanceSubscriptionsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Subscriptions" right={null} />
      <FinanceSubscriptionsClient subscriptions={data.subscriptions} entities={data.entities} />
    </>
  );
}

export async function FinanceReportsView() {
  const data = await requireWorkspaceData();
  const monthly = last6Months(data.transactions);
  const outgoing = data.transactions.filter((txn) => txn.type === "out");
  return (
    <>
      <Topbar title="Finance Reports" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="P&L Summary" value={money(data.transactions.reduce((sum, txn) => sum + (txn.type === "in" ? txn.amount_cents : -txn.amount_cents), 0))} />
          <Stat label="Burn Rate" value={money(outgoing.reduce((sum, txn) => sum + txn.amount_cents, 0))} />
          <Stat label="Categories" value={String(new Set(outgoing.map((txn) => txn.category)).size)} />
          <Stat label="Entities" value={String(data.entities.length)} />
        </StatGrid>
        <SectionCard title="Burn Trend">
          <LineMetricChart data={monthly.map((row) => ({ label: row.label, burn: row.value / 100 }))} lines={[{ key: "burn", color: "oklch(0.65 0.22 25)", name: "Burn" }]} />
        </SectionCard>
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Category</Th>
                  <Th>Transactions</Th>
                  <Th>Total</Th>
                </tr>
              </TableHeader>
              <tbody>
                {groupTransactionCategory(outgoing).map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <Td className="font-medium">{row.label}</Td>
                    <Td>{row.count}</Td>
                    <Td>{money(row.value)}</Td>
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

function totalForEntity(subscriptions: Awaited<ReturnType<typeof requireWorkspaceData>>["subscriptions"], name: string) {
  return subscriptions.filter((sub) => sub.entity_name === name && sub.active).reduce((sum, sub) => sum + sub.amount_cents, 0);
}

function groupByCategory(subscriptions: Awaited<ReturnType<typeof requireWorkspaceData>>["subscriptions"]) {
  const total = Math.max(1, subscriptions.reduce((sum, sub) => sum + sub.amount_cents, 0));
  return [...subscriptions.reduce((map, sub) => map.set(sub.category, (map.get(sub.category) ?? 0) + sub.amount_cents), new Map<string, number>()).entries()].map(([label, value]) => ({ label, value, share: Math.round((value / total) * 100) }));
}

function last6Months(transactions: Awaited<ReturnType<typeof requireWorkspaceData>>["transactions"]) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const value = transactions.filter((txn) => txn.type === "out" && new Date(txn.occurred_on).getMonth() === month && new Date(txn.occurred_on).getFullYear() === year).reduce((sum, txn) => sum + txn.amount_cents, 0);
    return { label: date.toLocaleString("en-US", { month: "short" }), value };
  });
}

function groupTransactionCategory(transactions: Awaited<ReturnType<typeof requireWorkspaceData>>["transactions"]) {
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const txn of transactions) {
    const entry = map.get(txn.category) ?? { label: txn.category, value: 0, count: 0 };
    entry.value += txn.amount_cents;
    entry.count += 1;
    map.set(txn.category, entry);
  }
  return [...map.values()];
}
