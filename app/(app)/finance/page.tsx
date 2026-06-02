import { Topbar } from "@/components/shell/topbar";
import { getOrgId } from "@/lib/auth/session";
import { listEntities, listSubscriptions } from "@/lib/data/finance";
import { FinanceClient } from "./finance-client";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const orgId = await getOrgId();
  if (!orgId) {
    return (<><Topbar title="Finance" /><div className="p-8 text-muted">No organization resolved.</div></>);
  }
  const [entities, subs] = await Promise.all([listEntities(orgId), listSubscriptions(orgId)]);
  return (
    <>
      <Topbar title="Finance" />
      <FinanceClient entities={entities} initialSubs={subs} />
    </>
  );
}
