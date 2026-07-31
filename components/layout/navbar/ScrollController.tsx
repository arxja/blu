"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowScroll } from "react-use";
import gsap from "gsap";

interface ScrollControllerProps {
  children: React.ReactNode;
}

export function ScrollController({ children }: ScrollControllerProps) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { y: currentScrollY } = useWindowScroll();
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
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

  // Scroll visibility logic
  useEffect(() => {
    const SCROLL_THRESHOLD = 10;
    const HIDE_DELAY_PX = 50;

    if (currentScrollY === 0) {
      setIsNavVisible(true);
      navRef.current?.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY && currentScrollY > HIDE_DELAY_PX) {
      setIsNavVisible(false);
      navRef.current?.classList.add("floating-nav");
    } else if (
      currentScrollY < lastScrollY &&
      Math.abs(currentScrollY - lastScrollY) > SCROLL_THRESHOLD
    ) {
      setIsNavVisible(true);
      navRef.current?.classList.add("floating-nav");
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  // GSAP animation
  useEffect(() => {
    if (!navRef.current) return;

    gsap.to(navRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      visibility: isNavVisible ? "visible" : "hidden",
      duration: prefersReducedMotion ? 0 : 0.3,
      pointerEvents: isNavVisible ? "auto" : "none",
      ease: "power2.out",
    });
  }, [isNavVisible, prefersReducedMotion]);

  return (
    <div ref={navRef} className="fixed inset-x-0 top-4 z-50 sm:inset-x-6">
      {children}
    </div>
  );
}
