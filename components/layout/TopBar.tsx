"use client";

import { usePathname } from "next/navigation";

import { WORKSPACE_NAV } from "@/lib/constants/navigation.constants";
import { findActiveNavItem } from "@/lib/workspace/nav-matching";

export function TopBar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname, WORKSPACE_NAV);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-light bg-surface px-6">
      <div className="text-lg font-semibold text-text-primary">
        {activeItem?.label ?? workspaceName}
      </div>
      <div className="flex items-center gap-2" />
    </header>
  );
}
