import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FileArchive,
  FileClock,
  FileText,
  FolderOpen,
  Gauge,
  Hammer,
  Headphones,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Mail,
  Megaphone,
  MessageSquareText,
  Package,
  PhoneCall,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  actionLabel: string;
}

export const NAV_GROUPS = [
  "CRM",
  "SALES",
  "DIALER",
  "MARKETING",
  "INTELLIGENCE",
  "AGENT",
  "FINANCE",
  "INTERNAL OPS",
  "INVENTORY",
  "DOCUMENTS & FILES",
  "COMPLIANCE",
  "ADMIN",
] as const;

export const NAV: NavItem[] = [
  { href: "/crm/dashboard", label: "CRM Overview", icon: LayoutDashboard, group: "CRM", actionLabel: "New Lead" },
  { href: "/crm/leads", label: "Leads", icon: Inbox, group: "CRM", actionLabel: "New Lead" },
  { href: "/crm/contacts", label: "Contacts", icon: ContactRound, group: "CRM", actionLabel: "New Contact" },
  { href: "/crm/deals", label: "Deals", icon: BriefcaseBusiness, group: "CRM", actionLabel: "New Deal" },
  { href: "/crm/opportunities", label: "Opportunities", icon: Target, group: "CRM", actionLabel: "New Opportunity" },
  { href: "/crm/pipeline", label: "Pipeline", icon: KanbanSquare, group: "CRM", actionLabel: "New Deal" },
  { href: "/crm/activities", label: "Activities", icon: Activity, group: "CRM", actionLabel: "Log Activity" },
  { href: "/crm/campaigns", label: "Campaigns", icon: Megaphone, group: "CRM", actionLabel: "New Campaign" },
  { href: "/crm/calendar", label: "Calendar", icon: CalendarDays, group: "CRM", actionLabel: "New Meeting" },

  { href: "/sales/overview", label: "Overview", icon: Gauge, group: "SALES", actionLabel: "New Deal" },
  { href: "/sales/forecasts", label: "Forecasts", icon: LineChart, group: "SALES", actionLabel: "New Forecast" },
  { href: "/sales/reports", label: "Reports", icon: BarChart3, group: "SALES", actionLabel: "Export Report" },
  { href: "/sales/team", label: "Team", icon: Users, group: "SALES", actionLabel: "Add Rep" },

  { href: "/dialer/dashboard", label: "Dashboard", icon: Headphones, group: "DIALER", actionLabel: "New Campaign" },
  { href: "/dialer/campaigns", label: "Campaigns", icon: PhoneCall, group: "DIALER", actionLabel: "New Campaign" },
  { href: "/dialer/live", label: "Live Monitor", icon: Activity, group: "DIALER", actionLabel: "Refresh" },
  { href: "/dialer/compliance", label: "Compliance", icon: ShieldCheck, group: "DIALER", actionLabel: "Upload DNC" },
  { href: "/dialer/recordings", label: "Recordings", icon: FileClock, group: "DIALER", actionLabel: "Export" },
  { href: "/dialer/reports", label: "Reports", icon: BarChart3, group: "DIALER", actionLabel: "Export Report" },

  { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone, group: "MARKETING", actionLabel: "New Campaign" },
  { href: "/marketing/email", label: "Email", icon: Mail, group: "MARKETING", actionLabel: "Send Email" },
  { href: "/marketing/sms", label: "SMS", icon: MessageSquareText, group: "MARKETING", actionLabel: "Send SMS" },
  { href: "/marketing/materials", label: "Materials", icon: Sparkles, group: "MARKETING", actionLabel: "Generate Asset" },
  { href: "/marketing/automation", label: "Automation", icon: Workflow, group: "MARKETING", actionLabel: "New Flow" },

  { href: "/intelligence/chat", label: "Chat", icon: BrainCircuit, group: "INTELLIGENCE", actionLabel: "Ask AEON" },
  { href: "/intelligence/docs", label: "Docs", icon: FileText, group: "INTELLIGENCE", actionLabel: "Upload Doc" },
  { href: "/intelligence/queries", label: "Queries", icon: FileClock, group: "INTELLIGENCE", actionLabel: "Export" },

  { href: "/agent/code", label: "Code", icon: Bot, group: "AGENT", actionLabel: "Run Agent" },
  { href: "/agent/marketing", label: "Marketing", icon: Sparkles, group: "AGENT", actionLabel: "Run Agent" },
  { href: "/agent/asset", label: "Asset", icon: FileArchive, group: "AGENT", actionLabel: "Run Agent" },
  { href: "/agent/history", label: "History", icon: FileClock, group: "AGENT", actionLabel: "Export" },

  { href: "/finance/dashboard", label: "Dashboard", icon: Wallet, group: "FINANCE", actionLabel: "New Transaction" },
  { href: "/finance/ledger", label: "Ledger", icon: ReceiptText, group: "FINANCE", actionLabel: "New Transaction" },
  { href: "/finance/subscriptions", label: "Subscriptions", icon: ClipboardCheck, group: "FINANCE", actionLabel: "New Subscription" },
  { href: "/finance/reports", label: "Reports", icon: BarChart3, group: "FINANCE", actionLabel: "Export Report" },

  { href: "/ops/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "INTERNAL OPS", actionLabel: "New Task" },
  { href: "/ops/tasks", label: "Tasks", icon: ClipboardCheck, group: "INTERNAL OPS", actionLabel: "New Task" },
  { href: "/ops/work-orders", label: "Work Orders", icon: Hammer, group: "INTERNAL OPS", actionLabel: "New Work Order" },
  { href: "/ops/employees", label: "Employees", icon: Users, group: "INTERNAL OPS", actionLabel: "New Employee" },
  { href: "/ops/timesheets", label: "Timesheets", icon: FileClock, group: "INTERNAL OPS", actionLabel: "New Timesheet" },
  { href: "/ops/forms", label: "Forms", icon: FileText, group: "INTERNAL OPS", actionLabel: "New Form" },
  { href: "/ops/requests", label: "Requests", icon: Inbox, group: "INTERNAL OPS", actionLabel: "New Request" },
  { href: "/ops/sops", label: "SOPs", icon: FolderOpen, group: "INTERNAL OPS", actionLabel: "New SOP" },
  { href: "/ops/calendar", label: "Calendar", icon: CalendarDays, group: "INTERNAL OPS", actionLabel: "New Event" },

  { href: "/inventory/dashboard", label: "Dashboard", icon: Package, group: "INVENTORY", actionLabel: "New Item" },
  { href: "/inventory/items", label: "Items", icon: Package, group: "INVENTORY", actionLabel: "New Item" },
  { href: "/inventory/catalog", label: "Catalog", icon: Building2, group: "INVENTORY", actionLabel: "New Catalog Item" },
  { href: "/inventory/bids", label: "Bids", icon: Hammer, group: "INVENTORY", actionLabel: "New Bid" },

  { href: "/files/drive", label: "Drive", icon: FolderOpen, group: "DOCUMENTS & FILES", actionLabel: "Connect Drive" },
  { href: "/files/documents", label: "Documents", icon: FileText, group: "DOCUMENTS & FILES", actionLabel: "Upload Document" },
  { href: "/files/reports", label: "Reports", icon: FileArchive, group: "DOCUMENTS & FILES", actionLabel: "Export Report" },

  { href: "/compliance/dnc", label: "DNC", icon: ShieldCheck, group: "COMPLIANCE", actionLabel: "Add Number" },
  { href: "/compliance/audit", label: "Audit Log", icon: FileClock, group: "COMPLIANCE", actionLabel: "Export Audit" },

  { href: "/admin/users", label: "Users", icon: Users, group: "ADMIN", actionLabel: "New User" },
  { href: "/admin/org", label: "Org", icon: Building2, group: "ADMIN", actionLabel: "Save Settings" },
  { href: "/admin/integrations", label: "Integrations", icon: Workflow, group: "ADMIN", actionLabel: "Connect" },
  { href: "/admin/settings", label: "Settings", icon: Settings, group: "ADMIN", actionLabel: "Save Settings" },
];

export function navItemFor(pathname: string) {
  return NAV.find((item) => item.href === pathname);
}

export function sectionsForGroup(group: string) {
  return NAV.filter((item) => item.group === group).map((item) => item.href.split("/").at(-1) ?? "");
}
