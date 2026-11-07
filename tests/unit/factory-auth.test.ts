import { afterEach, describe, expect, it, vi } from "vitest";
import { factoryRequestAuthorized } from "@/lib/server/factory-auth";

const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

describe("factoryRequestAuthorized", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts matching credentials and rejects others", () => {
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "admin");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "s3cret");
    expect(factoryRequestAuthorized(basic("admin", "s3cret"))).toBe(true);
    expect(factoryRequestAuthorized(basic("admin", "wrong"))).toBe(false);
    expect(factoryRequestAuthorized(null)).toBe(false);
  });

  it("denies production when credentials are not configured", () => {
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(factoryRequestAuthorized(null)).toBe(false);
  });
});
