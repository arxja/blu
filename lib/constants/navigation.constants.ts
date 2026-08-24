import { FooterItemsType, NavItemsTypes, UserDropdownItems } from "@/types/types";

export const NAVBAR_ITEMS: NavItemsTypes[] = [
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

export const USER_DROPDOWN_ITEMS: UserDropdownItems[] = [
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
        link: "/"
      }
    ]
  }
];

export const FOOTER_ITEMS: FooterItemsType[] = [
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

export const MOBILE_NAV_ITEMS: NavItemsTypes[] = [
  // Add mobile-specific navigation items
];
