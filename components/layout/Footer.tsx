"use client";

import { FOOTER_ITEMS } from "@/lib/constants";
import { NavItemsTypes } from "@/types/types";
import { Globe, MessageCircle, Send } from "lucide-react";
import Link from "next/link";

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: NavItemsTypes[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        {heading}
      </div>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.link}
              className="text-sm text-text-secondary hover:text-primary transition"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border-light bg-surface-elevated/40">
      <div className="max-w-300 mx-auto px-6 py-16 grid gap-10 md:grid-cols-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-lg text-text-primary">
            <span className="relative">
              Blu
              <span className="absolute -right-2 top-1 w-1.5 h-1.5 rounded-full bg-primary" />
            </span>
          </div>
          <p className="mt-3 text-sm text-text-secondary max-w-xs">
            Turn behavior into business.
          </p>
          <div className="mt-5 flex gap-3">
            {[Globe, MessageCircle, Send].map((Icon, index) => (
              <a
                key={`${Icon.displayName ?? "social"}-${index}`}
                href="#"
                className="p-2 rounded-lg border border-border-light text-text-tertiary hover:text-primary hover:border-primary transition"
                aria-label="social"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {FOOTER_ITEMS.map((column) => (
          <FooterColumn key={column.heading} {...column} />
        ))}
      </div>
      <div className="border-t border-border-light">
        <div className="max-w-300 mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-text-tertiary">
          <div>© {new Date().getFullYear()} Blu, Inc. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
