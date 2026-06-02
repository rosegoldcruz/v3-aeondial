import { Topbar } from "@/components/shell/topbar";
import { getOrgId } from "@/lib/auth/session";
import { listBids } from "@/lib/data/bids";
import { BidsClient } from "./bids-client";

export const dynamic = "force-dynamic";

export default async function BidsPage() {
  const orgId = await getOrgId();
  if (!orgId) return (<><Topbar title="Bids" /><div className="p-8 text-muted">No organization resolved.</div></>);
  const bids = await listBids(orgId);
  return (<><Topbar title="Bids" /><BidsClient bids={bids} /></>);
}
