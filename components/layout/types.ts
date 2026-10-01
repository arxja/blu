import { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  link: string;
}

export interface UserDropdownGroup {
  groupName: string;
  items: NavItem[];
}

export interface FooterGroup {
  heading: string;
  links: NavItem[];
}

export interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match: "exact" | "prefix";
}
