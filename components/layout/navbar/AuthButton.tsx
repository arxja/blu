"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_DROPDOWN_ITEMS } from "@/lib/constants";

export function AuthButton() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          render={<Button variant="outline" />}
        >
          {/* todo: replace the text with user's name/profile picture */}
          user
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {USER_DROPDOWN_ITEMS.map((group) => (
            <DropdownMenuGroup key={group.groupName}>
              <DropdownMenuLabel>{group.groupName}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuItem key={item.name}>
                  <Link href={item.link}>{item.name}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          ))}
          <DropdownMenuItem className="text-red-500" onClick={signOut}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      Login
    </Link>
  );
}
