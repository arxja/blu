"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export function AuthButton() {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Sign out
      </Button>
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
