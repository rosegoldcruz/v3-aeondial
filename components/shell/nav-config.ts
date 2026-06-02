import {
  LayoutDashboard, Users, TrendingUp, Wallet, Hammer,
  BrainCircuit, Bot, PhoneCall, Settings,
} from "lucide-react";

export interface NavItem {
  href: string; label: string; icon: any; group: string;
}

export const NAV: NavItem[] = [
  { href: "/dashboard",    label: "Command",       icon: LayoutDashboard, group: "Overview" },
  { href: "/crm",          label: "CRM",           icon: Users,           group: "Revenue" },
  { href: "/sales",        label: "Sales Ops",     icon: TrendingUp,      group: "Revenue" },
  { href: "/bids",         label: "Bids",          icon: Hammer,          group: "Revenue" },
  { href: "/finance",      label: "Finance",       icon: Wallet,          group: "Operations" },
  { href: "/intelligence", label: "Intelligence",  icon: BrainCircuit,    group: "AI" },
  { href: "/agent",        label: "Agent",         icon: Bot,             group: "AI" },
  { href: "/dialer",       label: "Dialer",        icon: PhoneCall,       group: "Telephony" },
  { href: "/settings",     label: "Settings",      icon: Settings,        group: "System" },
];

export const NAV_GROUPS = ["Overview", "Revenue", "Operations", "AI", "Telephony", "System"];
