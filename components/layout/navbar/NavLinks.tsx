import Link from "next/link";

interface NavLinksProps {
  items: Array<{ name: string; link: string }>;
}

export function NavLinks({ items }: NavLinksProps) {
  return (
    <div className="flex flex-row gap-2">
      {items.map((item, idx) => (
        <Link
          key={idx}
          className="nav-hover-btn text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary dark:text-text-primary dark:hover:text-primary-400 dark:focus-visible:text-primary-400"
          href={item.link}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
