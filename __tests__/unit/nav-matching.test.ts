import { describe, expect, it } from "vitest";

import type { WorkspaceNavItem } from "@/components/layout/types";
import { findActiveNavItem } from "@/lib/workspace/nav-matching";

// ─────────────────────────────────────────────────────────────────
// Fixtures
//
// A stubbed icon satisfies WorkspaceNavItem["icon"] without pulling
// lucide-react into the test runtime. This test is about pathname
// matching, not about rendering.
// ─────────────────────────────────────────────────────────────────

const StubIcon = (() => null) as unknown as WorkspaceNavItem["icon"];

const NAV: WorkspaceNavItem[] = [
  { label: "Overview", href: "", match: "exact", icon: StubIcon },
  { label: "Analytics", href: "analytics", match: "prefix", icon: StubIcon },
  { label: "Actions", href: "actions", match: "prefix", icon: StubIcon },
  { label: "Members", href: "members", match: "prefix", icon: StubIcon },
  { label: "Settings", href: "settings", match: "prefix", icon: StubIcon },
];

// Resolve a pathname to a label (or null) for compact assertions.
function labelFor(pathname: string): string | null {
  return findActiveNavItem(pathname, NAV)?.label ?? null;
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("findActiveNavItem", () => {
  describe("exact match (Overview)", () => {
    it.each([
      ["/", "Overview"],
      ["", "Overview"],
    ])("matches %s → %s", (pathname, expected) => {
      expect(labelFor(pathname)).toBe(expected);
    });

    it("does not match Overview for any sub-route", () => {
      expect(labelFor("/analytics")).toBe("Analytics");
      expect(labelFor("/members")).toBe("Members");
    });
  });

  describe("prefix match", () => {
    it.each([
      ["/analytics", "Analytics"],
      ["/analytics/users", "Analytics"],
      ["/analytics/users/123", "Analytics"],
      ["/actions", "Actions"],
      ["/actions/rules", "Actions"],
      ["/members", "Members"],
      ["/settings", "Settings"],
      ["/settings/billing", "Settings"],
      ["/settings/api-keys", "Settings"],
    ])("matches %s → %s", (pathname, expected) => {
      expect(labelFor(pathname)).toBe(expected);
    });
  });

  describe("segment boundaries", () => {
    // These would falsely match with a naive `startsWith(itemPath)` check.
    // The correct rule is: match only when the character after the
    // matched prefix is a path separator (`/`).
    it.each([
      ["/members-settings"],
      ["/analyticsx"],
      ["/settingsx"],
      ["/actions-archive"],
    ])("does not match %s", (pathname) => {
      expect(labelFor(pathname)).toBeNull();
    });
  });

  describe("pathname normalization", () => {
    it.each([
      ["/analytics?foo=bar", "Analytics"],
      ["/analytics#section", "Analytics"],
      ["/analytics?foo=bar#section", "Analytics"],
      ["/analytics/", "Analytics"],
      ["/analytics///", "Analytics"],
      ["/settings/billing?tab=usage", "Settings"],
    ])("normalizes %s → %s", (pathname, expected) => {
      expect(labelFor(pathname)).toBe(expected);
    });
  });

  describe("no match", () => {
    it.each([["/unknown"], ["/does-not-exist"], ["/foo/bar"]])(
      "returns null for %s",
      (pathname) => {
        expect(labelFor(pathname)).toBeNull();
      },
    );
  });

  describe("first-match-wins ordering", () => {
    it("returns the first matching item when multiple could match", () => {
      const overlapping: WorkspaceNavItem[] = [
        { label: "First", href: "analytics", match: "prefix", icon: StubIcon },
        {
          label: "Second",
          href: "analytics/users",
          match: "prefix",
          icon: StubIcon,
        },
      ];
      expect(findActiveNavItem("/analytics/users", overlapping)?.label).toBe(
        "First",
      );
    });
  });

  describe("input edge cases", () => {
    it("returns null when the nav array is empty", () => {
      expect(findActiveNavItem("/analytics", [])).toBeNull();
    });

    it("tolerates hrefs with a leading slash", () => {
      const withLeadingSlash: WorkspaceNavItem[] = [
        {
          label: "Slash",
          href: "/analytics",
          match: "prefix",
          icon: StubIcon,
        },
      ];
      expect(findActiveNavItem("/analytics", withLeadingSlash)?.label).toBe(
        "Slash",
      );
    });
  });
});
