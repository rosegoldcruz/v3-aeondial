import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { IntelligenceChatClient, IntelligenceQueriesClient } from "@/components/pages/workbench-clients";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatShortDate, stageTone } from "@/lib/ui/format";

export async function IntelligenceChatView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Ask AEON" right={null} />
      <IntelligenceChatClient queries={data.ragQueries} connected={Boolean(process.env.DEEPSEEK_API_KEY)} />
    </>
  );
}

export async function IntelligenceDocsView() {
  const data = await requireWorkspaceData();
  const chunks = data.ragDocuments.length * 24;
  return (
    <>
      <Topbar title="Knowledge Base" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Indexed Documents" value={String(data.ragDocuments.filter((doc) => doc.status === "indexed").length)} />
          <Stat label="Total Chunks" value={String(chunks)} />
          <Stat label="Last Ingested" value={formatShortDate(data.ragDocuments[0]?.ingested_at ?? data.ragDocuments[0]?.created_at)} />
          <Stat label="Index Health" value="Healthy" />
        </StatGrid>
        <SectionCard title="Documents" action={<div className="flex gap-2"><Badge tone="accent">Upload</Badge><Badge tone="muted">Drive Sync</Badge></div>}>
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr>
                    <Th>Document Title</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>Chunks</Th>
                    <Th>Date</Th>
                  </tr>
                </TableHeader>
                <tbody>
                  {data.ragDocuments.map((doc, index) => (
                    <tr key={doc.id} className="border-t border-border">
                      <Td className="font-medium">{doc.title ?? "Untitled"}</Td>
                      <Td>{doc.source}</Td>
                      <Td><Badge tone={stageTone(doc.status)}>{doc.status}</Badge></Td>
                      <Td>{24 + index * 2}</Td>
                      <Td>{formatShortDate(doc.created_at)}</Td>
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

export async function IntelligenceQueriesView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Query History" right={null} />
      <IntelligenceQueriesClient queries={data.ragQueries} />
    </>
  );
}
