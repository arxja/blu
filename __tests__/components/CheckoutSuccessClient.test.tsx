import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { navigateTo } from "@/components/pages/workspaces/workspace-navigation";
import CheckoutSuccessClient from "@/components/pages/billing/success/CheckoutSuccessClient";

vi.mock("@/components/pages/workspaces/workspace-navigation", () => ({
  navigateTo: vi.fn(),
}));

vi.mock("@/components/pages/workspaces/new/workspace-domain", () => ({
  getWorkspaceUrl: (subdomain: string) => `https://${subdomain}.blu.test`,
}));

const mockedNavigateTo = vi.mocked(navigateTo);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function flushAsyncWork() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("CheckoutSuccessClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an error when tenantId is missing", () => {
    render(<CheckoutSuccessClient tenantId={null} sessionId="cs_test_123" />);

    expect(
      screen.getByText("Missing workspace information."),
    ).toBeInTheDocument();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows confirming state while payment is pending", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        status: "pending_payment",
        plan: "pro",
        subdomain: "acme",
      }),
    );

    render(
      <CheckoutSuccessClient tenantId="tenant_123" sessionId="cs_test_123" />,
    );

    expect(screen.getByText("Confirming payment")).toBeInTheDocument();

    await flushAsyncWork();

    expect(fetch).toHaveBeenCalledWith(
      "/api/workspaces/tenant_123/billing/status",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  it("redirects to the tenant after status becomes active", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: "active",
        plan: "pro",
        subdomain: "acme",
      }),
    );

    render(
      <CheckoutSuccessClient tenantId="tenant_123" sessionId="cs_test_123" />,
    );

    await flushAsyncWork();

    expect(screen.getByText("Payment confirmed")).toBeInTheDocument();

    await advanceTimers(500);

    expect(mockedNavigateTo).toHaveBeenCalledWith("https://acme.blu.test");
  });

  it("continues polling while payment is pending", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          status: "pending_payment",
          plan: "pro",
          subdomain: "acme",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "active",
          plan: "pro",
          subdomain: "acme",
        }),
      );

    render(
      <CheckoutSuccessClient tenantId="tenant_123" sessionId="cs_test_123" />,
    );

    await flushAsyncWork();
    expect(fetch).toHaveBeenCalledTimes(1);

    await advanceTimers(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    expect(mockedNavigateTo).not.toHaveBeenCalled();

    await advanceTimers(500);
    expect(mockedNavigateTo).toHaveBeenCalledWith("https://acme.blu.test");
  });

  it("shows an error when the status request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          error: "Unable to retrieve billing status.",
        },
        500,
      ),
    );

    render(
      <CheckoutSuccessClient tenantId="tenant_123" sessionId="cs_test_123" />,
    );

    await flushAsyncWork();

    expect(
      screen.getByText("Unable to retrieve billing status."),
    ).toBeInTheDocument();

    expect(mockedNavigateTo).not.toHaveBeenCalled();
  });
});
