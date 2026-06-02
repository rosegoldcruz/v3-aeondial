import { Topbar } from "@/components/shell/topbar";
import { Card, Stat, SectionTitle, Badge } from "@/components/ui/primitives";
import { fmtUSD } from "@/lib/db/money";
import { getOrgId } from "@/lib/auth/session";
import { dealsByStage, listContacts, pipelineValueCents } from "@/lib/data/crm";

export const dynamic = "force-dynamic";
const STAGES = ["lead", "qualified", "proposal", "negotiation", "won"] as const;

export default async function CRMPage() {
  const orgId = await getOrgId();
  if (!orgId) return (<><Topbar title="CRM" /><div className="p-8 text-muted">No organization resolved.</div></>);
  const [byStage, contacts, pipeline] = await Promise.all([
    dealsByStage(orgId), listContacts(orgId), pipelineValueCents(orgId),
  ]);
  return (
    <>
      <Topbar title="CRM" />
      <div className="p-5 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Open Pipeline" value={fmtUSD(pipeline)} tone="ember" />
          <Stat label="Contacts" value={String(contacts.length)} />
          <Stat label="Open Deals" value={String(STAGES.slice(0,4).reduce((a,s)=>a+byStage[s].length,0))} />
          <Stat label="Won" value={String(byStage.won.length)} tone="gain" />
        </div>
        <SectionTitle>Pipeline</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STAGES.map((stage) => (
            <Card key={stage} className="min-h-[120px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider text-muted">{stage}</span>
                <Badge tone={stage === "won" ? "gain" : "ember"}>{byStage[stage].length}</Badge>
              </div>
              <div className="space-y-2">
                {byStage[stage].map((d) => (
                  <div key={d.id} className="rounded-lg border border-line bg-surface p-2">
                    <div className="text-xs text-ink truncate">{d.title}</div>
                    <div className="text-[10px] text-ember">{fmtUSD(d.value_cents)}</div>
                  </div>
                ))}
                {byStage[stage].length === 0 && <div className="text-[10px] text-dim">empty</div>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
