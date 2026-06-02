import { Topbar } from "@/components/shell/topbar";
import { Stat, Card, SectionTitle } from "@/components/ui/primitives";
import { fmtUSD } from "@/lib/db/money";
import { getOrgId } from "@/lib/auth/session";
import { pipelineValueCents, wonValueCents, recentActivity } from "@/lib/data/crm";
import { allEntityBurnCents } from "@/lib/data/finance";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orgId = await getOrgId();
  if (!orgId) {
    return (
      <>
        <Topbar title="Command" />
        <div className="p-8 text-muted">No organization resolved. Configure ZITADEL or set AEON_DEV_ORG_ID.</div>
      </>
    );
  }

  const [pipeline, won, burn, activity] = await Promise.all([
    pipelineValueCents(orgId),
    wonValueCents(orgId),
    allEntityBurnCents(orgId),
    recentActivity(orgId, 8),
  ]);

  return (
    <>
      <Topbar title="Command" />
      <div className="p-5 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Open Pipeline" value={fmtUSD(pipeline)} tone="ember" sub="active deals" />
          <Stat label="Won (lifetime)" value={fmtUSD(won)} tone="gain" />
          <Stat label="Monthly Burn" value={`${fmtUSD(burn)}/mo`} tone="loss" sub="all entities" />
          <Stat label="Net Signal" value={fmtUSD(won - burn)} tone={won - burn >= 0 ? "gain" : "loss"} />
        </div>

        <Card>
          <SectionTitle>Recent Activity</SectionTitle>
          {activity.length === 0 ? (
            <div className="text-sm text-muted py-6 text-center">No activity logged yet.</div>
          ) : (
            <div className="divide-y divide-line">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-ink">{a.subject ?? a.kind}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider">{a.kind}</div>
                  </div>
                  <div className="text-[10px] text-dim">{new Date(a.occurred_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-3 gap-3">
          <Card><SectionTitle>Intelligence</SectionTitle><div className="text-xs text-muted">Ask AEON about the business → /intelligence</div></Card>
          <Card><SectionTitle>Agent</SectionTitle><div className="text-xs text-muted">Generate code & marketing → /agent</div></Card>
          <Card><SectionTitle>Dialer</SectionTitle><div className="text-xs text-muted">Progressive call center → /dialer</div></Card>
        </div>
      </div>
    </>
  );
}
