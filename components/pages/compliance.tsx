import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { DialerComplianceClient } from "@/components/pages/workbench-clients";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatDateTime } from "@/lib/ui/format";

export async function ComplianceDncView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="DNC List" right={null} />
      <DialerComplianceClient numbers={data.dncNumbers} />
    </>
  );
}

export async function ComplianceAuditView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Audit Log" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Audit Entries" value={String(data.auditLog.length)} />
          <Stat label="Users Seen" value={String(new Set(data.auditLog.map((row) => row.user_id)).size)} />
          <Stat label="Resources" value={String(new Set(data.auditLog.map((row) => row.resource)).size)} />
          <Stat label="Latest Event" value={formatDateTime(data.auditLog[0]?.created_at)} />
        </StatGrid>
        <SectionCard title="Audit Trail">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>Action</Th><Th>Resource</Th><Th>Resource ID</Th><Th>IP</Th><Th>Timestamp</Th></tr>
                </TableHeader>
                <tbody>
                  {data.auditLog.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td><Badge tone="accent">{row.action}</Badge></Td>
                      <Td>{row.resource}</Td>
                      <Td>{row.resource_id ?? "NA"}</Td>
                      <Td>{row.ip ?? "127.0.0.1"}</Td>
                      <Td>{formatDateTime(row.created_at)}</Td>
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
