import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-600 transition-all hover:scale-105 hover:bg-primary-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-500/30 dark:text-primary-400"
    >
      <span className="text-sm font-semibold">Blu</span>
    </Link>
  );
}
