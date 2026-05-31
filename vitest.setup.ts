import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Next.js router if needed
beforeAll(() => {
  // Mock window.matchMedia (required for some UI components)
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {
      return null;
    }
    observe() {
      return null;
    }
    takeRecords() {
      return [];
    }
    unobserve() {
      return null;
    }
  } as any;
});
