import { timingSafeEqual } from "node:crypto";

function equalSecret(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function factoryAuthConfigured(): boolean {
  return Boolean(
    process.env.FACTORY_BASIC_AUTH_USERNAME && process.env.FACTORY_BASIC_AUTH_PASSWORD,
  );
}

export function basicAuthCredentialsMatch(authorization: string | null): boolean {
  const expectedUsername = process.env.FACTORY_BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.FACTORY_BASIC_AUTH_PASSWORD;
  if (!expectedUsername || !expectedPassword || !authorization?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return (
      equalSecret(decoded.slice(0, separator), expectedUsername) &&
      equalSecret(decoded.slice(separator + 1), expectedPassword)
    );
  } catch {
    return false;
  }
}

export function factoryRequestAuthorized(authorization: string | null): boolean {
  if (!factoryAuthConfigured()) return process.env.NODE_ENV !== "production";
  return basicAuthCredentialsMatch(authorization);
}

export function unauthorizedFactoryResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AI Code Factory", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function missingFactoryAuthResponse(): Response {
  return new Response("Factory Basic Auth is not configured.", {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}
