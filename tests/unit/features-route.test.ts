import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/features/route";
import { createCopilotFeatureIssue } from "@/lib/server/provision-project";

vi.mock("@/lib/server/provision-project", () => ({
  createCopilotFeatureIssue: vi.fn(),
  createFeatureBatchIssue: vi.fn(),
}));

const createRequest = (details: string) =>
  new Request("http://localhost/api/features", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
    body: JSON.stringify({ repository: "owner/repo", title: "Long feature", details }),
  });

describe("POST /api/features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createCopilotFeatureIssue).mockResolvedValue({
      number: 12,
      url: "https://github.com/owner/repo/issues/12",
    });
  });

  it("accepts long Markdown feature details up to 60,000 characters", async () => {
    const details = `# Feature\n\n${"x".repeat(60000 - 11)}`;
    const response = await POST(createRequest(details));

    expect(response.status).toBe(201);
    expect(createCopilotFeatureIssue).toHaveBeenCalledWith("owner/repo", "Long feature", details);
  });

  it("rejects feature details over 60,000 characters", async () => {
    const response = await POST(createRequest("x".repeat(60001)));

    expect(response.status).toBe(400);
    expect(createCopilotFeatureIssue).not.toHaveBeenCalled();
  });
});
