import type { Instrumentation } from "next";

/**
 * Server errors go to stderr as one JSON line each, which Coolify's log view and any log
 * drain can alert on. Only the message, digest and route are kept: request headers and
 * bodies can carry cookies or personal data.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: error instanceof Error ? error.message : String(error),
      digest: typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined,
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
    }),
  );
};
