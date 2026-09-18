import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* -------------------------------------------------------------------------- */
/*                                   MOCKS                                    */
/* -------------------------------------------------------------------------- */

const protectMock = vi.fn();
const shieldMock = vi.fn((opts) => ({ type: "shield", ...opts }));
const detectBotMock = vi.fn((opts) => ({ type: "bot", ...opts }));
const slidingWindowMock = vi.fn((opts) => ({ type: "rateLimit", ...opts }));
const arcjetMock = vi.fn(() => ({ protect: protectMock }));

vi.mock("@arcjet/next", () => ({
  default: arcjetMock,
  shield: shieldMock,
  detectBot: detectBotMock,
  slidingWindow: slidingWindowMock,
}));

vi.mock("@/lib/auth/jwt", () => ({
  verifyJWT: vi.fn(() => null),
}));

vi.mock("@/lib/tenancy/hostname", () => ({
  resolveHost: vi.fn(() => ({ type: "root" })),
}));

vi.mock("@/lib/config", () => ({
  serverConfig: { APP_URL: "https://app.blu.com" },
}));

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://app.blu.com${pathname}`), {
    method: "GET",
    headers: { host: "app.blu.com" },
  });
}

const allowed = () => ({
  isDenied: () => false,
  reason: { isBot: () => false, isRateLimit: () => false },
});

const botDenied = () => ({
  isDenied: () => true,
  reason: { isBot: () => true, isRateLimit: () => false },
});

const rateLimitDenied = (reset?: number) => ({
  isDenied: () => true,
  reason: { isBot: () => false, isRateLimit: () => true, reset },
});

const shieldDenied = () => ({
  isDenied: () => true,
  reason: { isBot: () => false, isRateLimit: () => false },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.ARCJET_KEY = "ajkey_test";
});

/* -------------------------------------------------------------------------- */
/*                            PROXY AUTH BEHAVIOR                             */
/* -------------------------------------------------------------------------- */

describe("proxy — auth route protection", () => {
  it("returns 403 when a bot is detected on /sign-in", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(botDenied());

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      code: 403,
      message: "Forbidden",
    });
  });

  it("returns 403 when a bot is detected on /sign-up", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(botDenied());

    const res = await proxy(makeRequest("/sign-up"));

    expect(res.status).toBe(403);
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(rateLimitDenied(240));

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("240");
    await expect(res.json()).resolves.toEqual({
      code: 429,
      message: "Too Many Requests",
    });
  });

  it("falls back to 300 when reason.reset is undefined", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(rateLimitDenied(undefined));

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.headers.get("Retry-After")).toBe("300");
  });

  it("prioritizes bot reason over rate limit reason", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce({
      isDenied: () => true,
      reason: { isBot: () => true, isRateLimit: () => true, reset: 300 },
    });

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.status).toBe(403);
  });

  it("returns 403 for shield denials (no bot, no rate limit)", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(shieldDenied());

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.status).toBe(403);
  });

  it("calls protect with (request, {}) — two arguments", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(allowed());

    const req = makeRequest("/sign-in");
    await proxy(req);

    expect(protectMock).toHaveBeenCalledTimes(1);
    const [calledReq, calledOpts] = protectMock.mock.calls[0];
    expect(calledReq).toBe(req);
    expect(calledOpts).toEqual({});
  });

  it("allows requests through when not denied", async () => {
    const { proxy } = await import("../../proxy");
    protectMock.mockResolvedValueOnce(allowed());

    const res = await proxy(makeRequest("/sign-in"));

    expect(res.status).toBe(200);
  });

  it("does not call Arcjet on non-auth routes", async () => {
    const { proxy } = await import("../../proxy");

    await proxy(makeRequest("/dashboard"));
    await proxy(makeRequest("/pricing"));

    expect(protectMock).not.toHaveBeenCalled();
  });

  it("does not call Arcjet on /api/* routes (delegated to handlers)", async () => {
    const { proxy } = await import("../../proxy");

    await proxy(makeRequest("/api/auth/sign-in"));

    expect(protectMock).not.toHaveBeenCalled();
  });
});
