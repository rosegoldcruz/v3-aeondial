import { query } from "@/lib/db/pool";
import type {
  Activity,
  AgentRun,
  AuditLog,
  Bid,
  Campaign,
  CatalogItem,
  Contact,
  Deal,
  DncNumber,
  Employee,
  Entity,
  InventoryItem,
  Lead,
  RagDocument,
  RagQuery,
  Sop,
  Subscription,
  Task,
  Timesheet,
  Transaction,
  User,
  WorkOrder,
} from "@/types/models";

export interface NamedDeal extends Deal {
  contact_name: string | null;
  owner_name: string | null;
}

export interface NamedLead extends Lead {
  owner_name: string | null;
}

export interface NamedContact extends Contact {
  owner_name: string | null;
}

export interface NamedActivity extends Activity {
  contact_name: string | null;
  deal_title: string | null;
  user_name: string | null;
}

export interface NamedTask extends Task {
  assignee_name: string | null;
}

export interface NamedWorkOrder extends WorkOrder {
  assignee_name: string | null;
}

export interface NamedTimesheet extends Timesheet {
  employee_name: string | null;
}

export interface NamedSubscription extends Subscription {
  entity_name: string | null;
}

export interface NamedTransaction extends Transaction {
  entity_name: string | null;
}

export interface NamedBid extends Bid {
  contact_name: string | null;
  owner_name: string | null;
}

export interface WorkspaceData {
  users: User[];
  entities: Entity[];
  contacts: NamedContact[];
  leads: NamedLead[];
  deals: NamedDeal[];
  activities: NamedActivity[];
  campaigns: Campaign[];
  subscriptions: NamedSubscription[];
  transactions: NamedTransaction[];
  catalogItems: CatalogItem[];
  bids: NamedBid[];
  ragDocuments: RagDocument[];
  ragQueries: RagQuery[];
  agentRuns: AgentRun[];
  tasks: NamedTask[];
  workOrders: NamedWorkOrder[];
  employees: Employee[];
  timesheets: NamedTimesheet[];
  sops: Sop[];
  inventoryItems: InventoryItem[];
  dncNumbers: DncNumber[];
  auditLog: AuditLog[];
}

export async function getWorkspaceData(orgId: string): Promise<WorkspaceData> {
  const [
    users,
    entities,
    contacts,
    leads,
    deals,
    activities,
    campaigns,
    subscriptions,
    transactions,
    catalogItems,
    bids,
    ragDocuments,
    ragQueries,
    agentRuns,
    tasks,
    workOrders,
    employees,
    timesheets,
    sops,
    inventoryItems,
    dncNumbers,
    auditLog,
  ] = await Promise.all([
    query<User>("SELECT * FROM users WHERE org_id=$1 ORDER BY name NULLS LAST, email", [orgId]),
    query<Entity>("SELECT * FROM entities WHERE org_id=$1 ORDER BY name", [orgId]),
    query<NamedContact>(
      `SELECT c.*, u.name AS owner_name
       FROM contacts c
       LEFT JOIN users u ON u.id = c.owner_id
       WHERE c.org_id=$1
       ORDER BY c.updated_at DESC`,
      [orgId]
    ),
    query<NamedLead>(
      `SELECT l.*, u.name AS owner_name
       FROM leads l
       LEFT JOIN users u ON u.id = l.owner_id
       WHERE l.org_id=$1
       ORDER BY l.updated_at DESC`,
      [orgId]
    ),
    query<NamedDeal>(
      `SELECT d.*, c.name AS contact_name, u.name AS owner_name
       FROM deals d
       LEFT JOIN contacts c ON c.id = d.contact_id
       LEFT JOIN users u ON u.id = d.owner_id
       WHERE d.org_id=$1
       ORDER BY d.updated_at DESC`,
      [orgId]
    ),
    query<NamedActivity>(
      `SELECT a.*, c.name AS contact_name, d.title AS deal_title, u.name AS user_name
       FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.org_id=$1
       ORDER BY a.occurred_at DESC`,
      [orgId]
    ),
    query<Campaign>("SELECT * FROM campaigns WHERE org_id=$1 ORDER BY created_at DESC", [orgId]),
    query<NamedSubscription>(
      `SELECT s.*, e.name AS entity_name
       FROM subscriptions s
       LEFT JOIN entities e ON e.id = s.entity_id
       WHERE s.org_id=$1
       ORDER BY s.amount_cents DESC`,
      [orgId]
    ),
    query<NamedTransaction>(
      `SELECT t.*, e.name AS entity_name
       FROM transactions t
       LEFT JOIN entities e ON e.id = t.entity_id
       WHERE t.org_id=$1
       ORDER BY t.occurred_on DESC, t.created_at DESC`,
      [orgId]
    ),
    query<CatalogItem>("SELECT * FROM catalog_items WHERE org_id=$1 ORDER BY line, sku", [orgId]),
    query<NamedBid>(
      `SELECT b.*, c.name AS contact_name, u.name AS owner_name
       FROM bids b
       LEFT JOIN contacts c ON c.id = b.contact_id
       LEFT JOIN users u ON u.id = b.owner_id
       WHERE b.org_id=$1
       ORDER BY b.updated_at DESC`,
      [orgId]
    ),
    query<RagDocument>("SELECT * FROM rag_documents WHERE org_id=$1 ORDER BY created_at DESC", [orgId]),
    query<RagQuery>("SELECT * FROM rag_queries WHERE org_id=$1 ORDER BY created_at DESC", [orgId]),
    query<AgentRun>("SELECT * FROM agent_runs WHERE org_id=$1 ORDER BY created_at DESC", [orgId]),
    query<NamedTask>(
      `SELECT t.*, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.org_id=$1
       ORDER BY t.created_at DESC`,
      [orgId]
    ),
    query<NamedWorkOrder>(
      `SELECT w.*, u.name AS assignee_name
       FROM work_orders w
       LEFT JOIN users u ON u.id = w.assignee_id
       WHERE w.org_id=$1
       ORDER BY w.created_at DESC`,
      [orgId]
    ),
    query<Employee>("SELECT * FROM employees WHERE org_id=$1 ORDER BY name", [orgId]),
    query<NamedTimesheet>(
      `SELECT ts.*, e.name AS employee_name
       FROM timesheets ts
       LEFT JOIN employees e ON e.id = ts.employee_id
       WHERE ts.org_id=$1
       ORDER BY ts.date DESC, ts.created_at DESC`,
      [orgId]
    ),
    query<Sop>("SELECT * FROM sops WHERE org_id=$1 ORDER BY category, title", [orgId]),
    query<InventoryItem>("SELECT * FROM inventory_items WHERE org_id=$1 ORDER BY category, sku", [orgId]),
    query<DncNumber>("SELECT * FROM dnc_numbers WHERE org_id=$1 ORDER BY added_at DESC", [orgId]),
    query<AuditLog>("SELECT * FROM audit_log WHERE org_id=$1 ORDER BY created_at DESC", [orgId]),
  ]);

  return {
    users,
    entities,
    contacts,
    leads,
    deals,
    activities,
    campaigns,
    subscriptions,
    transactions,
    catalogItems,
    bids,
    ragDocuments,
    ragQueries,
    agentRuns,
    tasks,
    workOrders,
    employees,
    timesheets,
    sops,
    inventoryItems,
    dncNumbers,
    auditLog,
  };
}
