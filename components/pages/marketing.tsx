import { Topbar } from "@/components/shell/topbar";
import { Stat } from "@/components/ui/primitives";
import { MarketingAutomationClient, MarketingEmailClient, MarketingMaterialsClient, MarketingSmsClient } from "@/components/pages/workbench-clients";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatShortDate, stageTone } from "@/lib/ui/format";
import { Badge } from "@/components/ui/primitives";

export async function MarketingCampaignsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Marketing Campaigns" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Campaigns" value={String(data.campaigns.length)} />
          <Stat label="Email" value={String(data.campaigns.filter((campaign) => campaign.type === "email").length)} />
          <Stat label="SMS" value={String(data.campaigns.filter((campaign) => campaign.type === "sms").length)} />
          <Stat label="Active" value={String(data.campaigns.filter((campaign) => campaign.status === "active").length)} />
        </StatGrid>
        <SectionCard title="Campaign List">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Sent</Th>
                    <Th>Opens</Th>
                    <Th>Created</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {data.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-t border-border">
                      <Td className="font-medium">{campaign.name}</Td>
                      <Td><Badge tone="accent">{campaign.type}</Badge></Td>
                      <Td><Badge tone={stageTone(campaign.status)}>{campaign.status}</Badge></Td>
                      <Td>{campaign.sent}</Td>
                      <Td>{campaign.opens}</Td>
                      <Td>{formatShortDate(campaign.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </DataTable>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function MarketingEmailView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Email" right={null} />
      <MarketingEmailClient campaigns={data.campaigns} contacts={data.contacts} connected={Boolean(process.env.SENDGRID_API_KEY)} />
    </>
  );
}

export async function MarketingSmsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="SMS" right={null} />
      <MarketingSmsClient campaigns={data.campaigns} contacts={data.contacts} connected={Boolean(process.env.TELNYX_API_KEY)} />
    </>
  );
}

export async function MarketingMaterialsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Materials" right={null} />
      <MarketingMaterialsClient runs={data.agentRuns} connected={Boolean(process.env.DEEPSEEK_API_KEY)} />
    </>
  );
}

export async function MarketingAutomationView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Automation" right={null} />
      <MarketingAutomationClient campaigns={data.campaigns} />
    </>
  );
}
