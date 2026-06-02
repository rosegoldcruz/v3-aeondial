import { Topbar } from "@/components/shell/topbar";
import { getOrgId } from "@/lib/auth/session";
import { dealsByStage, wonValueCents, pipelineValueCents } from "@/lib/data/crm";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const orgId = await getOrgId();
  if (!orgId) return (<><Topbar title="Sales Ops" /><div className="p-8 text-muted">No organization resolved.</div></>);
  const [byStage, won, pipeline] = await Promise.all([
    dealsByStage(orgId), wonValueCents(orgId), pipelineValueCents(orgId),
  ]);
  const funnel = (["lead","qualified","proposal","negotiation","won"] as const).map((s) => ({
    stage: s, count: byStage[s].length,
    value: byStage[s].reduce((a, d) => a + d.value_cents, 0) / 100,
  }));
  return (
    <>
      <Topbar title="Sales Ops" />
      <SalesClient funnel={funnel} wonCents={won} pipelineCents={pipeline} />
    </>
  );
}
