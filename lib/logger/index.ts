import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";
import {
  getServerConfig,
  getClientConfig,
  type ServerConfig,
  type ClientConfig,
} from "../config";

// server-only
if (typeof window !== "undefined") {
  throw new Error(
    "❌ Logger module imported on client side! Make sure you're using 'use server' or importing only in server components.",
  );
}

// Get configs
const serverConfig: ServerConfig = getServerConfig();
const clientConfig: ClientConfig = getClientConfig();

// Request context
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
  startTime?: number;
}>();

// Main logger
export const logger = pino({
  level: serverConfig.LOG_LEVEL,

  redact: [
    "password",
    "secret",
    "token",
    "req.headers.authorization",
    "req.headers.cookie",
    "body.password",
    "body.creditCard",
  ],

  ...(serverConfig.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),

  base: {
    env: serverConfig.NODE_ENV,
    version: process.env.npm_package_version,
    app: clientConfig.NEXT_PUBLIC_APP_NAME,
  },

  ...(serverConfig.NODE_ENV === "staging" && {
    formatters: {
      level: (label: string) => ({ level: label }),
    },
  }),

  ...(serverConfig.NODE_ENV === "production" && {
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

// Request-aware logger
export function getLogger() {
  const context = requestContext.getStore();
  if (!context) return logger;

  return logger.child({
    requestId: context.requestId,
    userId: context.userId,
    tenantId: context.tenantId,
    path: context.path,
    method: context.method,
    ...(context.startTime && { durationMs: Date.now() - context.startTime }),
  });
}

// Convenience methods
export const log = {
  info: (msg: string, data?: any) => getLogger().info(data, msg),
  error: (msg: string, error?: Error, data?: any) =>
    getLogger().error({ err: error, ...data }, msg),
  warn: (msg: string, data?: any) => getLogger().warn(data, msg),
  debug: (msg: string, data?: any) => getLogger().debug(data, msg),
  perf: (msg: string, durationMs: number, data?: any) => {
    getLogger().info({ type: "performance", durationMs, ...data }, msg);
  },
  request: (msg: string, data?: any) => {
    getLogger().info({ type: "request", ...data }, msg);
  },
  security: (msg: string, data?: any) => {
    getLogger().warn({ type: "security", ...data }, msg);
  },
};

// Error tracking
// if (serverConfig.SENTRY_DSN) {
  // ToDo: Initialize Sentry in instrumentation.ts
// }
