import { Topbar } from "@/components/shell/topbar";
import { Badge, Row, Stat } from "@/components/ui/primitives";
import { BarMetricChart } from "@/components/pages/charts";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { DialerComplianceClient } from "@/components/pages/workbench-clients";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatDateTime, formatShortDate, money, stageTone, timeAgo } from "@/lib/ui/format";

export async function DialerDashboardView() {
  const data = await requireWorkspaceData();
  const callRows = data.activities.filter((activity) => activity.kind === "call");
  const agents = data.users.slice(0, 4).map((user, index) => ({ name: user.name ?? user.email, status: index % 3 === 0 ? "in_call" : index % 2 === 0 ? "wrap" : "ready", duration: `${5 + index}m ${12 + index}s` }));
  return (
    <>
      <Topbar title="Dialer Dashboard" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Agents Online" value={String(agents.length)} />
          <Stat label="Calls Today" value={String(callRows.length)} />
          <Stat label="Avg Handle Time" value="04:42" />
          <Stat label="Connect Rate" value="31%" />
        </StatGrid>
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <SectionCard title="Agent Status Board">
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.duration}</div>
                  </div>
                  <Badge tone={stageTone(agent.status)}>{agent.status}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Call Activity by Hour">
            <BarMetricChart data={Array.from({ length: 8 }, (_, index) => ({ label: `${9 + index}:00`, calls: 3 + (index % 4) * 2 }))} bars={[{ key: "calls", color: "oklch(0.7 0.18 220)", name: "Calls" }]} />
          </SectionCard>
        </div>
        <SectionCard title="Recent Call Log">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Contact</Th>
                    <Th>Agent</Th>
                    <Th>Disposition</Th>
                    <Th>Time</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {callRows.slice(0, 8).map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td className="font-medium">{row.contact_name ?? row.subject ?? "Unknown"}</Td>
                      <Td>{row.user_name ?? "AEON"}</Td>
                      <Td><Badge tone="accent">connected</Badge></Td>
                      <Td>{timeAgo(row.occurred_at)}</Td>
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

export async function DialerCampaignsView() {
  const data = await requireWorkspaceData();
  const campaigns = data.campaigns.filter((campaign) => campaign.type === "dialer");
  return (
    <>
      <Topbar title="Dialer Campaigns" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Active Campaigns" value={String(campaigns.filter((campaign) => campaign.status === "active").length)} />
          <Stat label="Total Lists" value={String(campaigns.length)} />
          <Stat label="Calls Made" value={String(campaigns.reduce((sum, campaign) => sum + campaign.sent, 0))} />
          <Stat label="Contacts Remaining" value={String(campaigns.reduce((sum, campaign) => sum + Math.max(0, 1000 - campaign.sent), 0))} />
        </StatGrid>
        <DataTable>
          <TableShell>
            <table className="min-w-full">
              <TableHeader>
                <tr>
                  <Th>Campaign Name</Th>
                  <Th>List Size</Th>
                  <Th>Calls Made</Th>
                  <Th>Connected</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </TableHeader>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-border">
                    <Td className="font-medium">{campaign.name}</Td>
                    <Td>{1000 + campaign.sent}</Td>
                    <Td>{campaign.sent}</Td>
                    <Td>{campaign.opens}</Td>
                    <Td><Badge tone={stageTone(campaign.status)}>{campaign.status}</Badge></Td>
                    <Td>View</Td>
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

export async function DialerLiveView() {
  const data = await requireWorkspaceData();
  const cards = data.users.slice(0, 6).map((user, index) => ({
    name: user.name ?? user.email,
    status: index % 3 === 0 ? "In Call" : index % 2 === 0 ? "Wrap" : "Ready",
    contact: data.contacts[index % Math.max(1, data.contacts.length)]?.name ?? "Queue",
    duration: `00:0${index + 2}:2${index}`,
  }));
  return (
    <>
      <Topbar title="Live Monitor" right={null} />
      <PageSection>
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          {cards.filter((card) => card.status === "Ready").length} agents ready · {cards.filter((card) => card.status === "In Call").length} in call · {cards.filter((card) => card.status === "Wrap").length} in wrap
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.name} className={`rounded-xl border bg-card p-5 ${card.status === "In Call" ? "border-accent shadow-[0_0_0_1px_rgba(82,187,255,0.25)]" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{card.name}</div>
                <Badge tone={stageTone(card.status.toLowerCase().replace(" ", "_"))}>{card.status}</Badge>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Contact</div>
              <div className="mt-1 text-sm text-foreground">{card.contact}</div>
              <div className="mt-4 text-2xl font-semibold text-accent">{card.duration}</div>
            </div>
          ))}
        </div>
      </PageSection>
    </>
  );
}

export async function DialerComplianceView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="DNC / TCPA" right={null} />
      <DialerComplianceClient numbers={data.dncNumbers} />
    </>
  );
}

export async function DialerRecordingsView() {
  const data = await requireWorkspaceData();
  const calls = data.activities.filter((activity) => activity.kind === "call").slice(0, 8);
  return (
    <>
      <Topbar title="Recordings" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Recordings" value={String(calls.length)} />
          <Stat label="This Week" value={String(calls.filter((call) => Date.now() - new Date(call.occurred_at).getTime() < 7 * 86400000).length)} />
          <Stat label="Avg Duration" value="03:58" />
          <Stat label="Storage Used" value="1.2 GB" />
        </StatGrid>
        <SectionCard title="Call Recordings">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Date</Th>
                    <Th>Agent</Th>
                    <Th>Contact</Th>
                    <Th>Duration</Th>
                    <Th>Disposition</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {calls.map((call, index) => (
                    <tr key={call.id} className="border-t border-border">
                      <Td>{formatShortDate(call.occurred_at)}</Td>
                      <Td>{call.user_name ?? "AEON"}</Td>
                      <Td>{call.contact_name ?? "Unknown"}</Td>
                      <Td>0{index + 2}:1{index}</Td>
                      <Td><Badge tone="success">connected</Badge></Td>
                      <Td>Play</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </DataTable>
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="text-sm font-medium text-foreground">Audio Player</div>
            <div className="mt-2 h-10 rounded-lg bg-card px-4 py-2 text-sm text-muted-foreground">Select a recording row to play the call.</div>
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function DialerReportsView() {
  const data = await requireWorkspaceData();
  const calls = data.activities.filter((activity) => activity.kind === "call");
  return (
    <>
      <Topbar title="Dialer Reports" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Connect Rate" value="31%" />
          <Stat label="Talk Time" value="18h 44m" />
          <Stat label="Dispositions" value={String(calls.length)} />
          <Stat label="Campaigns" value={String(data.campaigns.filter((campaign) => campaign.type === "dialer").length)} />
        </StatGrid>
        <SectionCard title="Hourly Performance">
          <BarMetricChart data={Array.from({ length: 6 }, (_, index) => ({ label: `${10 + index}:00`, connects: 5 + index, talk: 12 + index * 2 }))} bars={[{ key: "connects", color: "oklch(0.7 0.18 145)", name: "Connects" }, { key: "talk", color: "oklch(0.7 0.18 220)", name: "Talk Time" }]} />
        </SectionCard>
      </PageSection>
    </>
  );
}
