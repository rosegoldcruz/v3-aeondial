import { Topbar } from "@/components/shell/topbar";
import { DriveBrowserClient, FilesDocumentsClient } from "@/components/pages/workbench-clients";
import { PageSection, SectionCard } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";

export async function FilesDriveView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Google Drive" right={null} />
      <DriveBrowserClient docs={data.ragDocuments} connected={Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID)} />
    </>
  );
}

export async function FilesDocumentsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Documents" right={null} />
      <FilesDocumentsClient docs={data.ragDocuments} />
    </>
  );
}

export async function FilesReportsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Saved Reports" right={null} />
      <PageSection>
        <SectionCard title="Generated Exports">
          <div className="space-y-3">
            {[...data.bids.slice(0, 3), ...data.transactions.slice(0, 3)].map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <div className="text-sm text-foreground">{"title" in row ? row.title : row.description}</div>
                <div className="text-xs text-muted-foreground">PDF export ready</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}
