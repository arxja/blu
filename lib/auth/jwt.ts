import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { serverConfig } from "../config";

const JWT_SECRET = serverConfig.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get("auth_token")?.value ?? null;
}

export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: serverConfig.AUTH_COOKIE_SECURE,
    sameSite: "lax",
    domain: serverConfig.AUTH_COOKIE_DOMAIN || undefined,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function removeAuthToken(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: serverConfig.AUTH_COOKIE_SECURE,
    sameSite: "lax",
    domain: serverConfig.AUTH_COOKIE_DOMAIN || undefined,
    maxAge: 0,
    path: "/",
  });
}
