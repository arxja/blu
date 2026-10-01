"use client";

import Link from "next/link";
import { Home, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const email = user?.email ?? "user@example.com";

  const triggerLabel = (
    <>
      <Avatar className="border border-border-light bg-surface-elevated cursor-pointer">
        <AvatarFallback className="bg-primary-500/10 text-xs font-semibold text-primary-600">
          {email.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <span className="truncate text-sm font-medium text-text-primary">
          {email}
        </span>
      )}
    </>
  );

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={[
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
          collapsed ? "justify-center" : "",
        ].join(" ")}
      >
        {triggerLabel}
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-60 rounded-xl border border-border-light bg-surface p-2 shadow-lg"
      >
        <div className="space-y-2">
          <div className="px-2 py-1">
            <p className="text-sm font-medium text-text-primary">{email}</p>
          </div>

          <Separator className="bg-border-light" />

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated"
          >
            <Home className="size-4 text-text-secondary" />
            <span>Dashboard</span>
          </Link>

          <Separator className="bg-border-light" />

          {/* <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-elevated text-red-500 cursor-pointer"
          >
            <LogOut className="size-4 text-text-secondary" />
            <span>Sign out</span>
          </button> */}
        </div>
      </PopoverContent>
    </Popover>
  );
}
