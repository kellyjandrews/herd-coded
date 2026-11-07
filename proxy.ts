import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

function credentialsMatch(authorization: string | null): boolean {
  const expectedUsername = process.env.FACTORY_BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.FACTORY_BASIC_AUTH_PASSWORD;
  if (!expectedUsername || !expectedPassword || !authorization?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const username = Buffer.from(decoded.slice(0, separator));
    const password = Buffer.from(decoded.slice(separator + 1));
    const expectedUser = Buffer.from(expectedUsername);
    const expectedPass = Buffer.from(expectedPassword);
    return (
      username.length === expectedUser.length &&
      password.length === expectedPass.length &&
      timingSafeEqual(username, expectedUser) &&
      timingSafeEqual(password, expectedPass)
    );
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const username = process.env.FACTORY_BASIC_AUTH_USERNAME;
  const password = process.env.FACTORY_BASIC_AUTH_PASSWORD;
  if (!username || !password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new Response("Factory Basic Auth is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (credentialsMatch(request.headers.get("authorization"))) return NextResponse.next();
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AI Code Factory", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
