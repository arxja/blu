import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { navigateTo } from "@/components/pages/workspaces/workspace-navigation";
import CreateWorkspaceWizard from "@/components/pages/workspaces/new/CreateWorkspaceWizard";


vi.mock("@/components/pages/workspaces/workspace-navigation", () => ({
  navigateTo: vi.fn(),
}));

vi.mock("@/components/pages/workspaces/new/workspace-domain", () => ({
  getWorkspaceBaseDomain: () => "blu.test:3000",
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

async function completeBasicsAndContinue() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Company name"), "Acme Inc.");

  await user.type(screen.getByLabelText("Workspace URL"), "acme");

  await user.click(
    screen.getByRole("button", {
      name: "Continue",
    }),
  );

  return user;
}

async function selectProAndContinue(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", {
      name: /Pro.*\$49/,
    }),
  );

  await user.click(
    screen.getByRole("button", {
      name: "Continue",
    }),
  );
}

async function completeConfigAndReview(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(screen.getByLabelText("Billing email"), "billing@acme.com");

  await user.click(
    screen.getByRole("button", {
      name: "Continue",
    }),
  );
}

describe("CreateWorkspaceWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("fetch", vi.fn());
  });

  describe("plan selection", () => {
    it("defaults to Free", async () => {
      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      expect(
        screen.getByRole("button", {
          name: /Free.*\$0/,
        }),
      ).toHaveTextContent("Selected");

      expect(
        screen.getByRole("button", {
          name: /Pro.*\$49/,
        }),
      ).toHaveTextContent("Select this plan");

      await user.click(
        screen.getByRole("button", {
          name: /Pro.*\$49/,
        }),
      );

      expect(
        screen.getByRole("button", {
          name: /Pro.*\$49/,
        }),
      ).toHaveTextContent("Selected");
    });

    it("changes the selected plan", async () => {
      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      const proButton = screen.getByRole("button", {
        name: /Pro.*\$49/,
      });

      await user.click(proButton);

      expect(proButton).toHaveTextContent("Selected");

      expect(
        screen.getByRole("button", {
          name: /Free.*\$0/,
        }),
      ).toHaveTextContent("Select this plan");
    });

    it("allows the selected plan to persist when moving forward and backward", async () => {
      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      await user.click(
        screen.getByRole("button", {
          name: /Pro.*\$49/,
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      expect(
        screen.getByRole("heading", {
          name: "Workspace configuration",
        }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Back",
        }),
      );

      expect(
        screen.getByRole("button", {
          name: /Pro.*\$49/,
        }),
      ).toHaveTextContent("Selected");
    });
  });

  describe("Free workspace flow", () => {
    it("creates a Free workspace and does not start Checkout", async () => {
      const fetchMock = vi.mocked(fetch);

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          workspace: {
            id: "tenant_free_123",
            subdomain: "acme",
          },
        }),
      );

      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      await user.type(
        screen.getByLabelText("Billing email"),
        "billing@acme.com",
      );

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      expect(
        screen.getByRole("heading", {
          name: "Review workspace",
        }),
      ).toBeInTheDocument();

      expect(screen.getByText("Free")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Create Workspace",
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/workspaces",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"plan":"free"'),
        }),
      );

      expect(mockedNavigateTo).toHaveBeenCalledWith(
        "http://acme.blu.test:3000",
      );
    });
  });

  describe("Pro workspace flow", () => {
    it("creates a Pro workspace and immediately starts Checkout", async () => {
      const fetchMock = vi.mocked(fetch);

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            workspace: {
              id: "tenant_pro_123",
              subdomain: "acme",
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            url: "https://checkout.stripe.com/cs_test_123",
          }),
        );

      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      await selectProAndContinue(user);
      await completeConfigAndReview(user);

      expect(
        screen.getByRole("button", {
          name: "Start Pro",
        }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", {
          name: "Start Pro",
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/workspaces",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"plan":"pro"'),
        }),
      );

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/workspaces/tenant_pro_123/billing/checkout",
        expect.objectContaining({
          method: "POST",
        }),
      );

      expect(mockedNavigateTo).toHaveBeenCalledWith(
        "https://checkout.stripe.com/cs_test_123",
      );
    });

    it("does not create a second workspace when Checkout fails", async () => {
      const fetchMock = vi.mocked(fetch);

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            workspace: {
              id: "tenant_pro_123",
              subdomain: "acme",
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(
            {
              error: "Unable to start checkout.",
            },
            500,
          ),
        );

      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      await selectProAndContinue(user);
      await completeConfigAndReview(user);

      await user.click(
        screen.getByRole("button", {
          name: "Start Pro",
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Unable to start checkout."),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", {
          name: "Retry Checkout",
        }),
      ).toBeInTheDocument();

      expect(fetchMock).toHaveBeenCalledTimes(2);

      /*
       * Retry only Checkout. It must NOT POST /api/workspaces again.
       */
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          url: "https://checkout.stripe.com/cs_retry_123",
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Retry Checkout",
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/workspaces/tenant_pro_123/billing/checkout",
        expect.objectContaining({
          method: "POST",
        }),
      );

      /*
       * Workspace creation happened exactly once.
       */
      const workspaceCreationCalls = fetchMock.mock.calls.filter(
        ([url]) => url === "/api/workspaces",
      );

      expect(workspaceCreationCalls).toHaveLength(1);

      expect(mockedNavigateTo).toHaveBeenCalledWith(
        "https://checkout.stripe.com/cs_retry_123",
      );
    });
  });

  describe("Enterprise", () => {
    it("does not allow self-service Enterprise submission", async () => {
      render(<CreateWorkspaceWizard />);

      const user = await completeBasicsAndContinue();

      await user.click(
        screen.getByRole("button", {
          name: /Enterprise.*\$499/,
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      await user.type(
        screen.getByLabelText("Billing email"),
        "billing@acme.com",
      );

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      const submitButton = screen.getByRole("button", {
        name: "Contact Sales",
      });

      expect(submitButton).toBeDisabled();
    });
  });

  describe("validation", () => {
    it("does not advance when Basics is invalid", async () => {
      render(<CreateWorkspaceWizard />);

      const user = userEvent.setup();

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      expect(
        screen.getByRole("heading", {
          name: "Create your workspace",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText("Company name must be at least 2 characters."),
      ).toBeInTheDocument();

      expect(
        screen.getByText("Subdomain must be at least 3 characters."),
      ).toBeInTheDocument();
    });

    it("does not submit when the final form is invalid", async () => {
      const fetchMock = vi.mocked(fetch);

      render(<CreateWorkspaceWizard />);

      const user = userEvent.setup();

      await user.type(screen.getByLabelText("Company name"), "Acme");

      await user.type(screen.getByLabelText("Workspace URL"), "acme");

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      /*
       * Billing email is intentionally omitted.
       */
      await user.click(
        screen.getByRole("button", {
          name: "Continue",
        }),
      );

      expect(
        screen.getByText("Enter a valid billing email."),
      ).toBeInTheDocument();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
