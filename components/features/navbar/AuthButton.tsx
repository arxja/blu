"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export function AuthButton() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="h-8 w-8 rounded-full bg-primary-500/20 ring-2 ring-primary-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" />
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
