import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { InventoryBidsClient } from "@/components/pages/workbench-clients";
import { DataTable, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { money, stageTone } from "@/lib/ui/format";

export async function InventoryDashboardView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Inventory Overview" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total SKUs" value={String(data.inventoryItems.length)} />
          <Stat label="Low Stock Alerts" value={String(data.inventoryItems.filter((item) => item.qty <= 5).length)} />
          <Stat label="Inventory Value" value={money(data.inventoryItems.reduce((sum, item) => sum + item.qty * item.cost_cents, 0))} />
          <Stat label="Catalog Items" value={String(data.catalogItems.length)} />
        </StatGrid>
        <SectionCard title="Inventory Snapshot">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.inventoryItems.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">{item.sku ?? item.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.category ?? "Cabinet"}</div>
                <div className="mt-3 text-xl font-semibold text-accent">{item.qty}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function InventoryItemsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="SKUs" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total SKUs" value={String(data.inventoryItems.length)} />
          <Stat label="Total Inventory Value" value={money(data.inventoryItems.reduce((sum, item) => sum + item.qty * item.cost_cents, 0))} />
          <Stat label="Low Stock Alerts" value={String(data.inventoryItems.filter((item) => item.qty <= 5).length)} />
          <Stat label="Categories" value={String(new Set(data.inventoryItems.map((item) => item.category ?? "General")).size)} />
        </StatGrid>
        <SectionCard title="Inventory Items">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>SKU</Th><Th>Name</Th><Th>Category</Th><Th>Qty</Th><Th>Cost</Th><Th>List Price</Th><Th>Bid Factor</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {data.inventoryItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <Td className="font-medium">{item.sku ?? "NA"}</Td>
                      <Td>{item.name}</Td>
                      <Td>{item.category ?? "Cabinet"}</Td>
                      <Td>{item.qty}</Td>
                      <Td>{money(item.cost_cents)}</Td>
                      <Td>{money(item.list_cents)}</Td>
                      <Td>{(item.list_cents / Math.max(1, item.cost_cents)).toFixed(2)}x</Td>
                      <Td>View</Td>
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

export async function InventoryCatalogView() {
  const data = await requireWorkspaceData();
  const framed = data.catalogItems.filter((item) => item.line === "framed");
  const frameless = data.catalogItems.filter((item) => item.line === "frameless");
  return (
    <>
      <Topbar title="Catalog" right={null} />
      <PageSection>
        <div className="flex gap-2">
          <Badge tone="accent">Framed</Badge>
          <Badge tone="muted">Frameless</Badge>
          <Badge tone="muted">Cabinets</Badge>
          <Badge tone="muted">Accessories</Badge>
        </div>
        <SectionCard title="Catalog Table">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>SKU</Th><Th>Description</Th><Th>Line</Th><Th>List Price</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {[...framed, ...frameless].map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <Td className="font-medium">{item.sku ?? "NA"}</Td>
                      <Td>{item.description}</Td>
                      <Td><Badge tone={item.line === "framed" ? "accent" : "muted"}>{item.line}</Badge></Td>
                      <Td>{money(item.list_cents)}</Td>
                      <Td>View</Td>
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

export async function InventoryBidsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Bids" right={null} />
      <InventoryBidsClient bids={data.bids} />
    </>
  );
}
