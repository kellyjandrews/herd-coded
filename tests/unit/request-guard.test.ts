import { describe, expect, it } from "vitest";
import { crossOriginResponse } from "@/lib/server/request-guard";

const request = (headers: Record<string, string>) =>
  new Request("https://factory.example/api/projects", {
    method: "POST",
    headers,
  });

describe("crossOriginResponse", () => {
  it("allows same-origin requests", () => {
    expect(crossOriginResponse(request({ origin: "https://factory.example" }))).toBeNull();
  });

  it.each([
    ["missing", {}],
    ["null", { origin: "null" }],
    ["malformed", { origin: "::not a url" }],
    ["different", { origin: "https://evil.example" }],
    ["cross-site fetch", { origin: "https://factory.example", "sec-fetch-site": "cross-site" }],
  ])("rejects %s origins with 403 JSON", async (_label, headers) => {
    const response = crossOriginResponse(request(headers));
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({ error: expect.any(String) });
  });
});
