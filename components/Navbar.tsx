"use client";

import { useAuth } from "@/hooks/useAuth";
import { NAVBAR_ITEMS } from "@/lib/constants";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWindowScroll } from "react-use";
import gsap from "gsap";

const Navbar = () => {
  const { user } = useAuth();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { y: currentScrollY } = useWindowScroll();
  const [lastScrollY, setLastScrollY] = useState(0);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const SCROLL_THRESHOLD = 10;
    const HIDE_DELAY_PX = 50;

    if (currentScrollY === 0) {
      setIsNavVisible(true);
      navContainerRef.current?.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY && currentScrollY > HIDE_DELAY_PX) {
      setIsNavVisible(false);
      navContainerRef.current?.classList.add("floating-nav");
    } else if (
      currentScrollY < lastScrollY &&
      Math.abs(currentScrollY - lastScrollY) > SCROLL_THRESHOLD
    ) {
      setIsNavVisible(true);
      navContainerRef.current?.classList.add("floating-nav");
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  useEffect(() => {
    if (!navContainerRef.current) return;

    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : 100,
      opacity: isNavVisible ? 1 : 0,
      visibility: isNavVisible ? "visible" : "hidden",
      duration: prefersReducedMotion ? 0 : 0.2,
      pointerEvents: isNavVisible ? "auto" : "none",
    });
  }, [isNavVisible, prefersReducedMotion]);

  return (
    <div
      ref={navContainerRef}
      className="fixed inset-x-0 top-4 z-50 h-16 border-none transition-all duration-700 sm:inset-x-6"
    >
      <header className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between px-6 py-2">
          {/* Left - Logo */}
          <div className="flex items-center gap-7">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-primary-600 transition-all hover:scale-105 hover:bg-primary-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-500/30 dark:text-primary-400"
            >
              {/* ToDo: change with actual logo */}
              <span className="text-sm font-semibold">SaaSify</span>
            </Link>
          </div>

          {/* Right - nav items & user */}
          <div className="flex flex-row items-center gap-6">
            {/* nav items */}
            <div className="flex flex-row gap-2">
              {NAVBAR_ITEMS.map((item, idx) => (
                <Link
                  className="nav-hover-btn text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:text-text-primary dark:text-text-primary dark:hover:text-primary-400 dark:focus-visible:text-primary-400"
                  href={item.link}
                  key={idx}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* User area */}
            {user ? (
              <div className="h-8 w-8 rounded-full bg-primary-500/20 ring-2 ring-primary-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" />
            ) : (
              <Link
                href="/sign-in"
                className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </header>
    </div>
  );
};

export default Navbar;
