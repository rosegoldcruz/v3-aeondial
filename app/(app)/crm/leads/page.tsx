import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentUser, getOrgId } from "@/lib/auth/session";
import { getLeadPoolStats, listOrgUsers } from "@/lib/data/leads";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function CRMLeadsPage() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const [stats, users, currentUser] = await Promise.all([
    getLeadPoolStats(orgId),
    listOrgUsers(orgId),
    getCurrentUser(),
  ]);

  return (
    <>
      <Topbar title="Leads" right={null} />
      <Suspense fallback={<div className="px-6 py-8 text-sm text-muted-foreground">Loading leads…</div>}>
        <LeadsClient stats={stats} users={users} currentUserId={currentUser?.id ?? null} />
      </Suspense>
    </>
  );
}