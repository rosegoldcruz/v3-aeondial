"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, GitBranch, Handshake, Building2,
  TrendingUp, ChartColumn, Settings, ChevronLeft, ChevronRight,
  Phone, Megaphone, BrainCircuit, Bot, Wallet, ClipboardList,
  Package, FolderOpen, ShieldCheck, UserCog, Zap, Mail,
  MessageSquare, Calendar, Target, FileText, Clock, BookOpen,
  Boxes, HardDrive, BarChart3, Bell, Search, Menu, X
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV = [
  {
    group: "// CRM",
    items: [
      { href: "/crm/dashboard",     label: "Overview",      icon: LayoutDashboard },
      { href: "/crm/leads",         label: "Leads",         icon: Target },
      { href: "/crm/contacts",      label: "Contacts",      icon: Building2 },
      { href: "/crm/pipeline",      label: "Pipeline",      icon: GitBranch },
      { href: "/crm/deals",         label: "Deals",         icon: Handshake },
      { href: "/crm/opportunities", label: "Opportunities", icon: TrendingUp },
      { href: "/crm/activities",    label: "Activities",    icon: Zap },
      { href: "/crm/campaigns",     label: "Campaigns",     icon: Megaphone },
      { href: "/crm/calendar",      label: "Calendar",      icon: Calendar },
    ],
  },
  {
    group: "// SALES",
    items: [
      { href: "/sales/overview",   label: "Overview",    icon: LayoutDashboard },
      { href: "/sales/forecasts",  label: "Forecasts",   icon: ChartColumn },
      { href: "/sales/reports",    label: "Reports",     icon: BarChart3 },
      { href: "/sales/team",       label: "Team",        icon: Users },
    ],
  },
  {
    group: "// DIALER",
    items: [
      { href: "/dialer/dashboard",   label: "Dashboard",   icon: Phone },
      { href: "/dialer/campaigns",   label: "Campaigns",   icon: Megaphone },
      { href: "/dialer/live",        label: "Live Monitor",icon: Bell },
      { href: "/dialer/compliance",  label: "DNC / TCPA",  icon: ShieldCheck },
      { href: "/dialer/recordings",  label: "Recordings",  icon: FileText },
    ],
  },
  {
    group: "// MARKETING",
    items: [
      { href: "/marketing/email",      label: "Email Blasts",  icon: Mail },
      { href: "/marketing/sms",        label: "SMS Blasts",    icon: MessageSquare },
      { href: "/marketing/materials",  label: "Materials",     icon: FileText },
      { href: "/marketing/automation", label: "Automation",    icon: Zap },
    ],
  },
  {
    group: "// AUTOMATIONS",
    items: [
      { href: "/automations",           label: "Workflows",     icon: Zap },
      { href: "/automations/runs",      label: "Run History",   icon: Clock },
    ],
  },
  {
    group: "// AUTO AGENCY",
    items: [
      { href: "/agency",              label: "Dashboard",     icon: LayoutDashboard },
      { href: "/agency/businesses",   label: "Businesses",    icon: Building2 },
      { href: "/agency/scoring",      label: "Scoring",       icon: BarChart3 },
      { href: "/agency/previews",     label: "Previews",      icon: HardDrive },
      { href: "/agency/campaigns",    label: "Campaigns",     icon: Mail },
      { href: "/agency/pipeline",     label: "Pipeline",      icon: GitBranch },
      { href: "/agency/fulfillment",  label: "Fulfillment",   icon: ClipboardList },
      { href: "/agency/agents",       label: "Agents",        icon: Bot },
    ],
  },
  {
    group: "// INTELLIGENCE",
    items: [
      { href: "/intelligence/chat",    label: "Ask AEON",     icon: BrainCircuit },
      { href: "/intelligence/docs",    label: "Knowledge",    icon: BookOpen },
      { href: "/intelligence/queries", label: "Query Log",    icon: ClipboardList },
    ],
  },
  {
    group: "// AGENT",
    items: [
      { href: "/agent/code",      label: "Code Agent",      icon: Bot },
      { href: "/agent/marketing", label: "Marketing Agent", icon: Megaphone },
      { href: "/agent/history",   label: "Run History",     icon: Clock },
    ],
  },
  {
    group: "// FINANCE",
    items: [
      { href: "/finance/dashboard",      label: "Overview",       icon: LayoutDashboard },
      { href: "/finance/ledger",         label: "Ledger",         icon: ClipboardList },
      { href: "/finance/subscriptions",  label: "Subscriptions",  icon: Wallet },
    ],
  },
  {
    group: "// INTERNAL OPS",
    items: [
      { href: "/ops/tasks",       label: "Tasks",       icon: ClipboardList },
      { href: "/ops/work-orders", label: "Work Orders", icon: Boxes },
      { href: "/ops/employees",   label: "Employees",   icon: Users },
      { href: "/ops/timesheets",  label: "Timesheets",  icon: Clock },
      { href: "/ops/sops",        label: "SOPs",        icon: BookOpen },
      { href: "/ops/requests",    label: "Requests",    icon: FileText },
    ],
  },
  {
    group: "// INVENTORY",
    items: [
      { href: "/inventory/items",   label: "SKUs",         icon: Package },
      { href: "/inventory/catalog", label: "Catalog",      icon: HardDrive },
      { href: "/inventory/bids",    label: "Bids",         icon: BarChart3 },
    ],
  },
  {
    group: "// FILES",
    items: [
      { href: "/files/drive",     label: "Google Drive",  icon: HardDrive },
      { href: "/files/documents", label: "Documents",     icon: FileText },
    ],
  },
  {
    group: "// ADMIN",
    items: [
      { href: "/admin/users",        label: "Users",        icon: UserCog },
      { href: "/admin/integrations", label: "Integrations", icon: Zap },
      { href: "/admin/settings",     label: "Settings",     icon: Settings },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:hidden"
      aria-label="Open navigation"
    >
      <Menu size={20} />
    </button>
    {mobileOpen && (
      <button
        type="button"
        onClick={() => setMobileOpen(false)}
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
        aria-label="Close navigation overlay"
      />
    )}
    <aside
      className={`fixed left-0 top-0 z-50 h-dvh bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col md:z-40 ${
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ width: collapsed && !mobileOpen ? "64px" : "min(82vw, 260px)" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-lg">🦊</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-base font-semibold text-sidebar-foreground whitespace-nowrap">AEON Dial</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">Operating System</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV.map((section) => (
          <div key={section.group} className="mb-2">
            {!collapsed && (
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {section.group}
              </div>
            )}
            {section.items.map((item) => {
              const active = path === item.href || path.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  {/* Active left indicator — exact match from salesops dashboard */}
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300"
                    style={{ opacity: active ? 1 : 0 }}
                  />
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={`shrink-0 transition-transform duration-200 ${
                      active ? "text-accent" : "group-hover:scale-110"
                    }`}
                  />
                  {!collapsed && (
                    <span className="whitespace-nowrap transition-all duration-300">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border shrink-0 space-y-1">
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 md:flex"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
    </>
  );
}
