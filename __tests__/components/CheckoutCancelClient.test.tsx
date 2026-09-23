import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { navigateTo } from "@/components/pages/workspaces/workspace-navigation";
import CheckoutCancelClient from "@/components/pages/billing/cancel/CheckoutCancelClient";

vi.mock("@/components/pages/workspaces/workspace-navigation", () => ({
  navigateTo: vi.fn(),
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

describe("CheckoutCancelClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("disables retry when tenantId is missing", () => {
    render(<CheckoutCancelClient tenantId={null} />);

    expect(
      screen.getByRole("button", {
        name: "Continue to Checkout",
      }),
    ).toBeDisabled();
  });

  it("retries Checkout for the existing tenant", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        url: "https://checkout.stripe.com/cs_retry_123",
      }),
    );

    render(<CheckoutCancelClient tenantId="tenant_123" />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue to Checkout",
      }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/workspaces/tenant_123/billing/checkout",
        {
          method: "POST",
        },
      );
    });

    expect(mockedNavigateTo).toHaveBeenCalledWith(
      "https://checkout.stripe.com/cs_retry_123",
    );
  });

  it("shows an error when retrying Checkout fails", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          error: "Unable to start checkout.",
        },
        500,
      ),
    );

    render(<CheckoutCancelClient tenantId="tenant_123" />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue to Checkout",
      }),
    );

    expect(
      await screen.findByText("Unable to start checkout."),
    ).toBeInTheDocument();

    expect(mockedNavigateTo).not.toHaveBeenCalled();
  });

  it("does not create a new workspace when retrying", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        url: "https://checkout.stripe.com/cs_retry_123",
      }),
    );

    render(<CheckoutCancelClient tenantId="tenant_123" />);

    await user.click(
      screen.getByRole("button", {
        name: "Continue to Checkout",
      }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(fetch).not.toHaveBeenCalledWith(
      "/api/workspaces",
      expect.anything(),
    );

    expect(
      vi.mocked(fetch).mock.calls.some(([url]) => url === "/api/workspaces"),
    ).toBe(false);
  });
});
