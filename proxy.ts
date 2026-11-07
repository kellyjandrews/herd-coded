import { type NextRequest, NextResponse } from "next/server";
import {
  basicAuthCredentialsMatch,
  factoryAuthConfigured,
  missingFactoryAuthResponse,
  unauthorizedFactoryResponse,
} from "@/lib/server/factory-auth";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  if (!factoryAuthConfigured()) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return missingFactoryAuthResponse();
  }

  if (basicAuthCredentialsMatch(request.headers.get("authorization"))) return NextResponse.next();
  return unauthorizedFactoryResponse();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
