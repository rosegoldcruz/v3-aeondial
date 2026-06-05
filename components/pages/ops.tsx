import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { OpsSopsClient, OpsTasksClient } from "@/components/pages/workbench-clients";
import { DataTable, GhostButton, PageSection, SectionCard, StatGrid, TableHeader, TableShell, Td, Th } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { formatDate, formatShortDate, stageTone, timeAgo, initials } from "@/lib/ui/format";
import { Avatar } from "@/components/ui/primitives";

export async function OpsDashboardView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Internal Command" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Open Tasks" value={String(data.tasks.filter((task) => task.status !== "done").length)} />
          <Stat label="Pending Work Orders" value={String(data.workOrders.filter((item) => item.status === "pending").length)} />
          <Stat label="Headcount" value={String(data.employees.length)} />
          <Stat label="Requests Open" value="9" />
        </StatGrid>
        <SectionCard title="Ops Pulse">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Team utilization<br /><span className="text-xl font-semibold text-foreground">82%</span></div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">Approvals pending<br /><span className="text-xl font-semibold text-foreground">6</span></div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">On-time completion<br /><span className="text-xl font-semibold text-success">91%</span></div>
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function OpsTasksView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Tasks" right={null} />
      <OpsTasksClient tasks={data.tasks} users={data.users} />
    </>
  );
}

export async function OpsWorkOrdersView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Work Orders" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Pending" value={String(data.workOrders.filter((row) => row.status === "pending").length)} />
          <Stat label="In Progress" value={String(data.workOrders.filter((row) => row.status === "in_progress").length)} />
          <Stat label="Completed" value={String(data.workOrders.filter((row) => row.status === "completed").length)} />
          <Stat label="Overdue" value={String(data.workOrders.filter((row) => row.due_date && new Date(row.due_date) < new Date() && row.status !== "completed").length)} />
        </StatGrid>
        <SectionCard title="Work Orders">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>Title</Th><Th>Assignee</Th><Th>Status</Th><Th>Due Date</Th><Th>Notes</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {data.workOrders.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td className="font-medium">{row.title}</Td>
                      <Td>{row.assignee_name ?? "Unassigned"}</Td>
                      <Td><Badge tone={stageTone(row.status)}>{row.status}</Badge></Td>
                      <Td>{formatDate(row.due_date)}</Td>
                      <Td>{row.notes ?? "No notes"}</Td>
                      <Td><GhostButton title="Coming soon" disabled>View</GhostButton></Td>
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

export async function OpsEmployeesView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Employees" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total" value={String(data.employees.length)} />
          <Stat label="Active" value={String(data.employees.filter((row) => row.status === "active").length)} />
          <Stat label="Departments" value={String(new Set(data.employees.map((row) => row.role ?? "Ops")).size)} />
          <Stat label="New This Month" value={String(data.employees.filter((row) => new Date(row.created_at).getMonth() === new Date().getMonth()).length)} />
        </StatGrid>
        <SectionCard title="Employee Directory">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>Name</Th><Th>Role</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {data.employees.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td><div className="flex items-center gap-3"><Avatar initials={initials(row.name)} /><span className="font-medium">{row.name}</span></div></Td>
                      <Td>{row.role ?? "Ops"}</Td>
                      <Td>{row.email ?? "No email"}</Td>
                      <Td>{row.phone ?? "No phone"}</Td>
                      <Td><Badge tone={stageTone(row.status)}>{row.status}</Badge></Td>
                      <Td><GhostButton title="Coming soon" disabled>Edit</GhostButton></Td>
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

export async function OpsTimesheetsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Timesheets" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Hours This Week" value={String(data.timesheets.reduce((sum, row) => sum + Number(row.hours), 0))} />
          <Stat label="Pending Approval" value={String(data.timesheets.filter((row) => row.status === "pending").length)} />
          <Stat label="Approved" value={String(data.timesheets.filter((row) => row.status === "approved").length)} />
          <Stat label="Rejected" value={String(data.timesheets.filter((row) => row.status === "rejected").length)} />
        </StatGrid>
        <SectionCard title="Timesheet Log">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>Employee</Th><Th>Date</Th><Th>Hours</Th><Th>Job Code</Th><Th>Status</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {data.timesheets.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td className="font-medium">{row.employee_name ?? "Employee"}</Td>
                      <Td>{formatShortDate(row.date)}</Td>
                      <Td>{row.hours}</Td>
                      <Td>{row.job_code ?? "OPS"}</Td>
                      <Td><Badge tone={stageTone(row.status)}>{row.status}</Badge></Td>
                      <Td><GhostButton title="Coming soon" disabled>Approve</GhostButton></Td>
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

export async function OpsSopsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="SOPs" right={null} />
      <OpsSopsClient sops={data.sops} />
    </>
  );
}

export async function OpsRequestsView() {
  const data = await requireWorkspaceData();
  const rows = data.auditLog.slice(0, 8).map((row, index) => ({ id: row.id, title: `${row.resource} request`, requester: data.users[index % Math.max(1, data.users.length)]?.name ?? "AEON", status: index % 3 === 0 ? "completed" : index % 2 === 0 ? "in_review" : "open", category: row.resource, date: row.created_at, assignee: data.users[(index + 1) % Math.max(1, data.users.length)]?.name ?? "Ops" }));
  return (
    <>
      <Topbar title="Requests" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Open Requests" value={String(rows.filter((row) => row.status === "open").length)} />
          <Stat label="In Review" value={String(rows.filter((row) => row.status === "in_review").length)} />
          <Stat label="Completed" value={String(rows.filter((row) => row.status === "completed").length)} />
          <Stat label="Avg Resolution Time" value="18h" />
        </StatGrid>
        <SectionCard title="Request Queue">
          <DataTable>
            <TableShell>
              <table className="min-w-full">
                <TableHeader>
                  <tr><Th>Title</Th><Th>Requester</Th><Th>Status</Th><Th>Category</Th><Th>Date</Th><Th>Assignee</Th><Th>Actions</Th></tr>
                </TableHeader>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <Td className="font-medium">{row.title}</Td>
                      <Td>{row.requester}</Td>
                      <Td><Badge tone={stageTone(row.status)}>{row.status}</Badge></Td>
                      <Td>{row.category}</Td>
                      <Td>{formatShortDate(row.date)}</Td>
                      <Td>{row.assignee}</Td>
                      <Td><GhostButton title="Coming soon" disabled>View</GhostButton></Td>
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

export async function OpsFormsView() {
  return (
    <>
      <Topbar title="Forms" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Active Forms" value="5" />
          <Stat label="Submissions" value="148" />
          <Stat label="Pending Review" value="12" />
          <Stat label="Automated Routes" value="3" />
        </StatGrid>
        <SectionCard title="Form Builder List">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {["New Hire Intake", "Site Inspection", "Cabinet Punch List"].map((name) => (
              <div key={name} className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">{name}</div>
                <div className="mt-2 text-xs text-muted-foreground">Submissions routed into ops requests and audit log.</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function OpsCalendarView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Ops Calendar" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Work Orders" value={String(data.workOrders.length)} />
          <Stat label="Schedules" value={String(data.employees.length)} />
          <Stat label="Deadlines" value={String(data.tasks.length)} />
          <Stat label="This Week" value="14 items" />
        </StatGrid>
        <SectionCard title="Calendar Snapshot">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 14 }, (_, index) => (
              <div key={index} className="rounded-xl border border-border bg-secondary/30 p-3">
                <div className="text-sm font-semibold text-foreground">{index + 1}</div>
                <div className="mt-3 text-xs text-muted-foreground">{index % 2 === 0 ? "2 work orders" : "1 deadline"}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}
