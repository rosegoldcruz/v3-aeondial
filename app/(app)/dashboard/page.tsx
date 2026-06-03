import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { getOrgId } from "@/lib/auth/session";
import {
  getActivityHeatmap,
  getDashboardDeltas,
  getDashboardInsight,
  getDashboardKPIs,
  getIntegrationStatus,
  getPipelineStages,
  getPriorityActions,
  getRecentDeals,
  getRecentLeads,
  getRevenueTrend,
} from "@/lib/data/dashboard";
import { OverviewClient } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const [
    kpis,
    deltas,
    priorityActions,
    recentDeals,
    recentLeads,
    revenueTrend,
    pipelineStages,
    heatmap,
    integrations,
    insight,
  ] = await Promise.all([
    getDashboardKPIs(orgId),
    getDashboardDeltas(orgId),
    getPriorityActions(orgId),
    getRecentDeals(orgId),
    getRecentLeads(orgId),
    getRevenueTrend(orgId),
    getPipelineStages(orgId),
    getActivityHeatmap(orgId),
    Promise.resolve(getIntegrationStatus()),
    getDashboardInsight(orgId),
  ]);

  return (
    <>
      <Topbar title="Mission Control" right={null} />
      <OverviewClient
        kpis={kpis}
        deltas={deltas}
        priorityActions={priorityActions}
        recentDeals={recentDeals}
        recentLeads={recentLeads}
        revenueTrend={revenueTrend}
        pipelineStages={pipelineStages}
        heatmap={heatmap}
        integrations={integrations}
        initialInsight={insight}
      />
    </>
  );
}