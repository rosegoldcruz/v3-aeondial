import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { AgentWorkbenchClient } from "@/components/pages/workbench-clients";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatDateTime, stageTone } from "@/lib/ui/format";

export async function AgentCodeView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Code Agent" right={null} />
      <AgentWorkbenchClient runs={data.agentRuns} kind="code" connected={Boolean(process.env.DEEPSEEK_API_KEY)} />
    </>
  );
}

export async function AgentMarketingView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Marketing Agent" right={null} />
      <AgentWorkbenchClient runs={data.agentRuns} kind="marketing" connected={Boolean(process.env.DEEPSEEK_API_KEY)} />
    </>
  );
}

export async function AgentAssetView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Asset Agent" right={null} />
      <AgentWorkbenchClient runs={data.agentRuns} kind="asset" connected={Boolean(process.env.DEEPSEEK_API_KEY)} />
    </>
  );
}

export async function AgentHistoryView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Agent History" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Runs" value={String(data.agentRuns.length)} />
          <Stat label="Code Runs" value={String(data.agentRuns.filter((run) => run.kind === "code").length)} />
          <Stat label="Marketing Runs" value={String(data.agentRuns.filter((run) => run.kind === "marketing").length)} />
          <Stat label="Asset Runs" value={String(data.agentRuns.filter((run) => run.kind === "asset").length)} />
        </StatGrid>
        <SectionCard title="Run History">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Kind</Th>
                    <Th>Prompt</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {data.agentRuns.map((run) => (
                    <tr key={run.id} className="border-t border-border">
                      <Td><Badge tone={stageTone(run.kind)}>{run.kind}</Badge></Td>
                      <Td className="font-medium">{run.prompt.slice(0, 96)}</Td>
                      <Td>{run.status}</Td>
                      <Td>{formatDateTime(run.created_at)}</Td>
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
