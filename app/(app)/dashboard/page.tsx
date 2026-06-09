import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentUser, getOrgId } from "@/lib/auth/session";
import { getDashboardPageData } from "@/lib/data/dashboard";
import { OverviewClient } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");
  const currentUser = await getCurrentUser();

  // Single consolidated fetch: 6 parallel queries vs the old 20+ sequential
  const data = await getDashboardPageData(orgId);

  const pipelineStr = (data.kpis.pipelineValueCents / 100).toLocaleString("en-US");
  const wonStr = (data.kpis.wonThisMonthCents / 100).toLocaleString("en-US");
  const burnStr = (data.kpis.monthlyBurnCents / 100).toLocaleString("en-US");
  const runway =
    data.kpis.monthlyBurnCents > 0
      ? Math.round(data.kpis.wonThisMonthCents / data.kpis.monthlyBurnCents)
      : 0;
  const initialInsight = {
    insight: `Pipeline stands at $${pipelineStr} across active deals. Won $${wonStr} this month with ${data.kpis.newLeadsCount} new leads this week. Monthly burn is $${burnStr}/mo${runway > 0 ? ` — projected runway ${runway} months` : ""}.`,
    source: "computed" as const,
  };

  return (
    <>
      <Topbar title="Mission Control" right={null} />
      <OverviewClient
        kpis={data.kpis}
        deltas={data.deltas}
        priorityActions={data.priorityActions}
        recentDeals={data.recentDeals}
        recentLeads={data.recentLeads}
        revenueTrend={data.revenueTrend}
        pipelineStages={data.pipelineStages}
        heatmap={data.heatmap}
        integrations={data.integrations}
        initialInsight={initialInsight}
        cryptoReportReadKey={currentUser?.id ?? currentUser?.email ?? orgId}
      />
    </>
  );
}
