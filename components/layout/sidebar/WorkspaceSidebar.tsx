"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "cn";

import { UserMenu } from "@/components/layout/sidebar/UserMenu";
import { Separator } from "@/components/ui/separator";
import { WORKSPACE_NAV } from "@/lib/constants/navigation.constants";
import { findActiveNavItem } from "@/lib/workspace/nav-matching";

const SIDEBAR_COLLAPSED_KEY = "blu.sidebar.collapsed";

export function WorkspaceSidebar({
  subdomain,
  workspaceName,
}: {
  subdomain: string;
  workspaceName: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const activeItem = findActiveNavItem(pathname, WORKSPACE_NAV);

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border-light bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between border-b border-border-light px-2 py-3">
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
          className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-surface-elevated text-sm font-semibold text-text-primary ring-1 ring-border-light">
              {workspaceName.slice(0, 1).toUpperCase()}
            </div>
            <div className="truncate text-sm font-medium text-text-primary">
              {workspaceName}
            </div>
          </div>
        )}
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {WORKSPACE_NAV.map((item) => {
            const itemPath = item.href ? `/${item.href}` : "/";
            const isActive = activeItem?.label === item.label;
            const Icon = item.icon;

            return (
              <li key={item.label}>
                <Link
                  href={itemPath}
                  className={cn(
                    "group relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3",
                    isActive
                      ? "bg-surface-elevated text-text-primary"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary-500" />
                  )}
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive
                        ? "text-primary-500"
                        : "text-text-secondary group-hover:text-text-primary",
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 pb-4">
        <Separator className="mb-3 bg-border-light" />
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
