import type { WorkspaceNavItem } from "@/components/layout/types";

export function findActiveNavItem(
  pathname: string,
  items: WorkspaceNavItem[],
): WorkspaceNavItem | null {
  const cleanPath =
    pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  for (const item of items) {
    const target = item.href.replace(/^\/+/, "");
    const itemPath = target ? `/${target}` : "/";

    if (item.match === "exact") {
      if (cleanPath === itemPath) {
        return item;
      }
      continue;
    }

    if (
      cleanPath === itemPath ||
      (cleanPath.startsWith(`${itemPath}/`) && itemPath !== "/")
    ) {
      return item;
    }
  }

  return null;
}
