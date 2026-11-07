import blake from "blakejs";
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { parseCsvTitles } from "@/lib/server/feature-queue";
import { checkStatusFromRollup, deriveFeatureState } from "@/lib/server/feature-state";
import { sealSecret } from "@/lib/server/repo-secrets";
import { productionUrlFor, summarizeDeployments } from "@/lib/server/vercel";

const open = {
  state: "OPEN" as const,
  queued: false,
  assignedToCopilot: false,
};

describe("deriveFeatureState", () => {
  it.each([
    ["done when closed", { ...open, state: "CLOSED" as const }, undefined, "done"],
    ["done when PR merged", open, { state: "MERGED" as const, isDraft: false, title: "x" }, "done"],
    [
      "working while Copilot WIP draft",
      open,
      { state: "OPEN" as const, isDraft: true, title: "[WIP] x" },
      "working",
    ],
    ["pr-open when ready", open, { state: "OPEN" as const, isDraft: false, title: "x" }, "pr-open"],
    ["working when assigned", { ...open, assignedToCopilot: true }, undefined, "working"],
    [
      "open when Copilot's PR was closed unmerged",
      { ...open, assignedToCopilot: true },
      { state: "CLOSED" as const, isDraft: true, title: "x" },
      "open",
    ],
    ["queued when labeled", { ...open, queued: true }, undefined, "queued"],
    ["open otherwise", open, undefined, "open"],
  ])("%s", (_label, issue, pr, expected) => {
    expect(deriveFeatureState(issue, pr)).toBe(expected);
  });

  it("maps check rollups", () => {
    expect(checkStatusFromRollup("SUCCESS")).toBe("passing");
    expect(checkStatusFromRollup("FAILURE")).toBe("failing");
    expect(checkStatusFromRollup("PENDING")).toBe("pending");
    expect(checkStatusFromRollup(null)).toBe("none");
  });
});

describe("Vercel deployment summary", () => {
  const project = {
    id: "prj_1",
    name: "app",
    targets: {
      production: { alias: ["app-git-main-team.vercel.app", "app.vercel.app"] },
    },
  };

  it("prefers a project domain over git aliases", () => {
    expect(productionUrlFor(project)).toBe("https://app.vercel.app");
  });

  it("uses the alias Vercel assigned when <name>.vercel.app was taken", () => {
    const taken = {
      id: "prj_2",
      name: "clinic-helper",
      targets: {
        production: {
          alias: ["clinic-helper-one.vercel.app", "clinic-helper-git-main-herd-coded.vercel.app"],
        },
      },
    };
    expect(productionUrlFor(taken)).toBe("https://clinic-helper-one.vercel.app");
  });

  it("falls back to the production deployment URL, never a guessed name", () => {
    expect(
      productionUrlFor({
        id: "x",
        name: "bare",
        targets: {
          production: { alias: [], url: "bare-abc123-team.vercel.app" },
        },
      }),
    ).toBe("https://bare-abc123-team.vercel.app");
    expect(productionUrlFor({ id: "x", name: "bare" })).toBeUndefined();
    expect(
      productionUrlFor({
        id: "x",
        name: "bare",
        targets: { production: { alias: ["bare-git-main-team.vercel.app"] } },
      }),
    ).toBeUndefined();
  });

  it("picks the latest production deployment and one preview per PR", () => {
    const summary = summarizeDeployments(project, [
      {
        uid: "1",
        url: "app-pr8b.vercel.app",
        state: "BUILDING",
        meta: { githubPrId: "8" },
      },
      {
        uid: "2",
        url: "app-prod2.vercel.app",
        state: "READY",
        target: "production",
        created: 2,
      },
      {
        uid: "3",
        url: "app-pr8a.vercel.app",
        state: "READY",
        meta: { githubPrId: "8" },
      },
      {
        uid: "4",
        url: "app-prod1.vercel.app",
        state: "ERROR",
        target: "production",
        created: 1,
      },
    ]);
    expect(summary.production).toMatchObject({
      url: "https://app.vercel.app",
      state: "READY",
    });
    expect(summary.previews.get(8)).toEqual({
      url: "https://app-pr8b.vercel.app",
      state: "BUILDING",
    });
  });
});

describe("sealSecret", () => {
  it("produces a libsodium sealed box the recipient can open", () => {
    const recipient = nacl.box.keyPair();
    const sealed = new Uint8Array(
      Buffer.from(
        sealSecret(Buffer.from(recipient.publicKey).toString("base64"), "s3cret"),
        "base64",
      ),
    );
    const ephemeral = sealed.slice(0, nacl.box.publicKeyLength);
    const nonce = blake.blake2b(
      new Uint8Array([...ephemeral, ...recipient.publicKey]),
      undefined,
      nacl.box.nonceLength,
    );
    const opened = nacl.box.open(
      sealed.slice(nacl.box.publicKeyLength),
      nonce,
      ephemeral,
      recipient.secretKey,
    );
    expect(opened && new TextDecoder().decode(opened)).toBe("s3cret");
  });
});

describe("parseCsvTitles", () => {
  it("reads the title column", () => {
    expect(parseCsvTitles('body,title\n"x",Login\ny,"Dark mode"\n\n')).toEqual([
      "Login",
      "Dark mode",
    ]);
  });
});
