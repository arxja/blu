import type { FooterGroup, NavItem, UserDropdownGroup } from "@/components/layout/types";

export const NAVBAR_ITEMS: NavItem[] = [
  {
    name: "Pricing",
    link: "/pricing",
  },
  {
    name: "About",
    link: "/#",
  },
  {
    name: "Contact",
    link: "/#",
  },
];

export const USER_DROPDOWN_ITEMS: UserDropdownGroup[] = [
  {
    groupName: "Account",
    items: [
      {
        name: "dashboard",
        link: "/dashboard"
      },
      {
        name: "settings",
        link: "/settings",
      },
      {
        name: "invitations",
        link: "/invitations",
      }
    ]
  },
  {
    groupName: "Workspace",
    items: [
      {
        name: "new",
        link: "/workspaces/new"
      }
    ]
  }
];

export const FOOTER_ITEMS: FooterGroup[] = [
  {
    heading: "Product",
    links: [
      { name: "Features", link: "#" },
      { name: "Integrations", link: "#" },
      { name: "Changelog", link: "#" },
      { name: "Pricing", link: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { name: "About", link: "#" },
      { name: "Customers", link: "#" },
      { name: "Careers", link: "#" },
      { name: "Contact", link: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { name: "Docs", link: "#" },
      { name: "Blog", link: "#" },
      { name: "Guides", link: "#" },
      { name: "API", link: "#" },
    ],
  },
  {
    heading: "Support",
    links: [
      { name: "Help Center", link: "#" },
      { name: "Status", link: "#" },
      { name: "Community", link: "#" },
      { name: "Security", link: "#" },
    ],
  },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  // Add mobile-specific navigation items
];
