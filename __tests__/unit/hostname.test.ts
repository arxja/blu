// @vitest-environment node
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

let resolveHost: (host: string | null) => any;

async function setupResolver(appUrl: string, nodeEnv = "development") {
  vi.resetModules();

  const oldAppUrl = process.env.APP_URL;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldBaseDomain = process.env.APP_BASE_DOMAIN;

  (process.env as any).APP_URL = appUrl;
  (process.env as any).NODE_ENV = nodeEnv;
  // Ensure APP_BASE_DOMAIN matches the scenario so resolveHost can
  // correctly detect tenant subdomains in tests.
  (process.env as any).APP_BASE_DOMAIN =
    nodeEnv === "development" ? "localhost" : new URL(appUrl).hostname;

  const mod = await import("@/lib/tenancy/hostname");
  resolveHost = mod.resolveHost;

  return () => {
    (process.env as any).APP_URL = oldAppUrl;
    (process.env as any).NODE_ENV = oldNodeEnv;
    (process.env as any).APP_BASE_DOMAIN = oldBaseDomain;
  };
}

describe.each([
  { name: "development", appUrl: "http://app.blu.test:3000" },
  { name: "production", appUrl: "https://blu.so" },
])("resolveHost (%s)", ({ name, appUrl }) => {
  let restoreEnv: (() => void) | undefined;

  beforeAll(async () => {
    restoreEnv = await setupResolver(
      appUrl,
      name === "production" ? "production" : "development",
    );
  });

  afterAll(() => {
    if (restoreEnv) restoreEnv();
    vi.resetModules();
  });

  if (name === "development") {
    it("resolves the development root domain", () => {
      expect(resolveHost("localhost:3000")).toEqual({
        type: "root",
        hostname: "localhost",
      });
    });

    it("resolves a development tenant", () => {
      expect(resolveHost("demo.localhost:3000")).toEqual({
        type: "tenant",
        hostname: "demo.localhost",
        subdomain: "demo",
      });
    });
  } else {
    it("resolves the production root domain", () => {
      expect(resolveHost("blu.so")).toEqual({
        type: "root",
        hostname: "blu.so",
      });
    });

    it("resolves a production tenant", () => {
      expect(resolveHost("demo.blu.so")).toEqual({
        type: "tenant",
        hostname: "demo.blu.so",
        subdomain: "demo",
      });
    });

    it("does not treat www as a tenant", () => {
      expect(resolveHost("www.blu.so")).toEqual({
        type: "root",
        hostname: "www.blu.so",
      });
    });

    it("does not treat an unrelated domain as a tenant", () => {
      expect(resolveHost("evil.com")).toEqual({
        type: "root",
        hostname: "evil.com",
      });
    });

    it("rejects nested tenant subdomains", () => {
      expect(resolveHost("foo.demo.blu.so")).toEqual({
        type: "root",
        hostname: "foo.demo.blu.so",
      });
    });
  }
});

describe("correct internal route", () => {
  it("identifies app.blu.test as the root application", () => {
    expect(resolveHost("app.blu.test:3000")).toEqual({
      type: "root",
      hostname: "app.blu.test",
    });
  });

  it("does not accept nested subdomains", () => {
    expect(resolveHost("foo.demo.blu.test:3000")).toEqual({
      type: "root",
      hostname: "foo.demo.blu.test",
    });
  });
});
