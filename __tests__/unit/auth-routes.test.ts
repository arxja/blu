// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { connectDB, findOne, create, hash } = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({ connectDB }));
vi.mock("@/lib/database/models/dashboardUser.model", () => ({
  default: {
    findOne,
    create,
  },
}));
vi.mock("bcryptjs", () => ({
  default: {
    hash,
  },
}));
vi.mock("@/lib/auth/jwt", () => ({
  signJWT: vi.fn(() => "test-token"),
}));

import { POST } from "@/app/api/auth/sign-up/route";

describe("sign-up route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
    findOne.mockResolvedValue(null);
    create.mockResolvedValue({
      _id: "user-id",
      email: "test@example.com",
      name: "Test User",
    });
    hash.mockResolvedValue("hashed-password");
  });

  it("connects to the database before checking for an existing user", async () => {
    const req = new NextRequest("http://localhost/api/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({
        email: "Test@Example.com",
        name: "Test User",
        password: "password123",
      }),
    });

    const res = await POST(req);

    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(res.status).toBe(200);
  });
});
