import z from "zod";

const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED_SUBDOMAINS = new Set([
  "app",
  "www",
  "api",
  "admin",
  "status",
  "docs",
  "support",
]);

export const createWorkspaceSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters.")
    .max(100, "Company name is too long."),

  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Subdomain must be at least 3 characters.")
    .max(63, "Subdomain is too long.")
    .regex(
      SUBDOMAIN_REGEX,
      "Subdomain may only contain lowercase letters, numbers, and hyphens.",
    )
    .refine(
      (value) => !RESERVED_SUBDOMAINS.has(value),
      "This subdomain is reserved.",
    ),

  billingEmail: z
    .string()
    .trim()
    .email("Enter a valid billing email.")
    .transform((value) => value.toLowerCase()),

  logo: z
    .string()
    .trim()
    .url("Logo must be a valid URL.")
    .optional()
    .or(z.literal("")),

  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
