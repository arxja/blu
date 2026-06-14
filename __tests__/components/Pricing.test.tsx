import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pricing from "@/components/Pricing";

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn((fn) => {
      fn();
      return { revert: vi.fn() };
    }),
  },
  ScrollTrigger: {
    create: vi.fn(),
  },
}));

const originalEnv = process.env;

describe("Pricing Component", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_STRIPE_CHECKOUT_URL: "https://checkout.stripe.com",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Rendering", () => {
    it("renders all three pricing plans", () => {
      render(<Pricing />);
      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("displays correct prices for monthly billing (default)", () => {
      render(<Pricing />);
      expect(screen.getByText("$0")).toBeInTheDocument();
      expect(screen.getByText("$49")).toBeInTheDocument();
      expect(screen.getByText("$499")).toBeInTheDocument();

      const monthTexts = screen.getAllByText("/month");
      expect(monthTexts.length).toBe(2);
    });

    it("displays correct badges", () => {
      render(<Pricing />);
      expect(screen.getByText("Most Popular")).toBeInTheDocument();
      expect(screen.getByText("Best Value")).toBeInTheDocument();
    });

    it("renders all features for Free plan", () => {
      render(<Pricing />);
      expect(
        screen.getByText(/1,000 monthly tracked users/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/100,000 events \/ month/i)).toBeInTheDocument();
      expect(screen.getByText(/30-day data retention/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Core analytics: funnels, retention/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/3 dashboards/i)).toBeInTheDocument();
      expect(screen.getByText(/5 reports/i)).toBeInTheDocument();
      expect(screen.getByText(/Community support/i)).toBeInTheDocument();
    });

    it("renders limit indicators for Pro plan", () => {
      render(<Pricing />);
      const proElements = screen.getAllByText(/Pro/);
      const proCard = proElements[0].closest(".relative");

      expect(proCard?.textContent).toContain("API Rate Limit");
      expect(proCard?.textContent).toContain("Data Retention");
      expect(proCard?.textContent).toContain("Team Seats");
      expect(proCard?.textContent).toContain("1,000 req/min");
      expect(proCard?.textContent).toContain("180 days");
      expect(proCard?.textContent).toContain("10");
    });
  });

  describe("Billing Toggle", () => {
    it("switches to yearly pricing when toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<Pricing />);

      expect(screen.getByText("$49")).toBeInTheDocument();

      const toggle = screen.getByRole("button");
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText("$500")).toBeInTheDocument();
      });

      await waitFor(() => {
        const yearTexts = screen.getAllByText("/year");
        expect(yearTexts.length).toBeGreaterThan(0);
      });
    });

    it("displays savings message for Pro plan when yearly is selected", async () => {
      const user = userEvent.setup();
      render(<Pricing />);

      const toggle = screen.getByRole("button");
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText(/Save \$88\/year/i)).toBeInTheDocument();
      });
    });

    it("shows 'Save 15%' badge on toggle", () => {
      render(<Pricing />);
      expect(screen.getByText(/Save 15%/i)).toBeInTheDocument();
    });

    it("maintains correct price after toggling back to monthly", async () => {
      const user = userEvent.setup();
      render(<Pricing />);

      const toggle = screen.getByRole("button");

      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText("$500")).toBeInTheDocument();
      });

      await user.click(toggle);
      await waitFor(() => {
        expect(screen.getByText("$49")).toBeInTheDocument();
      });

      await waitFor(() => {
        const monthTexts = screen.getAllByText("/month");
        expect(monthTexts.length).toBe(2);
      });
    });
  });

  describe("CTA Buttons", () => {
    it("renders correct button text for each plan", () => {
      render(<Pricing />);
      expect(screen.getByText("Get Started")).toBeInTheDocument();
      expect(screen.getByText("Start Pro Trial")).toBeInTheDocument();
      expect(screen.getByText("Contact Sales")).toBeInTheDocument();
    });

    it("has correct href for Free plan", () => {
      render(<Pricing />);
      const freeButton = screen.getByText("Get Started").closest("a");
      expect(freeButton).toHaveAttribute(
        "href",
        expect.stringContaining("?plan=free&billing=monthly"),
      );
    });

    it("has correct href for Pro plan with monthly billing", () => {
      render(<Pricing />);
      const proButton = screen.getByText("Start Pro Trial").closest("a");
      expect(proButton).toHaveAttribute(
        "href",
        expect.stringContaining("?plan=pro&billing=monthly"),
      );
    });

    it("updates Pro plan href when billing changes to yearly", async () => {
      const user = userEvent.setup();
      render(<Pricing />);

      const toggle = screen.getByRole("button");
      await user.click(toggle);

      await waitFor(() => {
        const proButton = screen.getByText("Start Pro Trial").closest("a");
        expect(proButton).toHaveAttribute(
          "href",
          expect.stringContaining("?plan=pro&billing=yearly"),
        );
      });
    });

    it("has mailto link for Enterprise plan", () => {
      render(<Pricing />);
      const enterpriseButton = screen.getByText("Contact Sales").closest("a");
      expect(enterpriseButton).toHaveAttribute(
        "href",
        "mailto:sales@example.com",
      );
    });
  });

  describe("Visual Elements", () => {
    it("applies popular badge styling to Pro plan card", () => {
      render(<Pricing />);
      const badge = screen.getByText("Most Popular");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(
        "absolute",
        "-top-3",
        "left-1/2",
        "-translate-x-1/2",
      );
    });

    it("renders checkmark icons for all features", () => {
      render(<Pricing />);
      const svgs = document.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(10);

      const path = svgs[0]?.querySelector("path");
      expect(path).toHaveAttribute(
        "d",
        expect.stringContaining("M5 13l4 4L19 7"),
      );
    });
  });

  describe("Responsive Behavior", () => {
    it("applies responsive text classes to heading", () => {
      render(<Pricing />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveClass("text-4xl", "sm:text-5xl", "lg:text-6xl");
    });

    it("applies responsive grid classes", () => {
      render(<Pricing />);
      const grid = document.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-3");
    });
  });

  describe("Edge Cases", () => {
    it("handles correct path redirection", () => {
      const SC = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL;
      render(<Pricing />);
      const proButton = screen.getByText("Start Pro Trial").closest("a");
      expect(proButton).toHaveAttribute(
        "href",
        `${SC}?plan=pro&billing=monthly`,
      );
    });

    it("does not show savings message for Free plan when yearly is selected", async () => {
      const user = userEvent.setup();
      render(<Pricing />);

      const toggle = screen.getByRole("button");
      await user.click(toggle);

      const allSavingsMessages = screen.queryAllByText(/Save \$/i);
      expect(allSavingsMessages.length).toBe(2);
    });

    it("displays 'Unlimited' text for unlimited seats in Enterprise", () => {
      render(<Pricing />);
      const unlimitedTexts = screen.getAllByText("Unlimited");
      expect(unlimitedTexts.length).toBeGreaterThan(0);

      const enterpriseCard = screen
        .getByText("Enterprise")
        .closest(".relative");
      expect(enterpriseCard).toBeTruthy();
    });
  });
});

describe("Pricing Component - Accessibility", () => {
  it("has proper heading hierarchy", () => {
    render(<Pricing />);
    const headings = document.querySelectorAll("h1, h2");
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0].tagName).toBe("H1");

    const h2s = Array.from(document.querySelectorAll("h2"));
    expect(h2s.length).toBe(3);
  });

  it("toggle button has focus styles", () => {
    render(<Pricing />);
    const toggle = screen.getByRole("button");
    expect(toggle.className).toContain("focus:outline-none");
    expect(toggle.className).toContain("focus:ring-2");
  });
});
