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
