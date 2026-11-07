export const appTemplateFiles: Record<string, string> = {
  ".gitignore": `node_modules/\n.next/\nout/\n.vercel/\n.env\n.env.local\n.env.*.local\n*.tsbuildinfo\nplaywright-report/\ntest-results/\ncoverage/\n`,
  "package.json": JSON.stringify(
    {
      name: "new-app",
      version: "0.1.0",
      private: true,
      type: "module",
      engines: { node: ">=20" },
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "biome check .",
        typecheck: "tsc --noEmit",
        verify: "npm run lint && npm run typecheck",
      },
      dependencies: {
        next: "16.4.3",
        react: "19.2.0",
        "react-dom": "19.2.0",
      },
      devDependencies: {
        "@biomejs/biome": "2.0.0",
        "@types/node": "22.0.0",
        "@types/react": "19.0.0",
        "@types/react-dom": "19.0.0",
        typescript: "5.6.3",
      },
    },
    null,
    2,
  ),
  "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),
  "biome.json": JSON.stringify(
    {
      $schema: "https://biomejs.dev/schemas/2.0.0/schema.json",
      files: { includes: ["app/**", "tests/**", "*.ts", "*.tsx"] },
      formatter: { indentStyle: "space", indentWidth: 2, lineWidth: 100 },
      linter: { enabled: true, rules: { preset: "recommended" } },
    },
    null,
    2,
  ),
  "AGENTS.md": `# Next.js project guidance

This app uses Next.js 16. Read the relevant guide under node_modules/next/dist/docs before changing app-router or deployment code. Use Server Components by default and small Client Components only for interactivity. Run npm run verify and npm run build before opening a PR.
`,
  ".github/copilot-instructions.md": `# Project instructions

- Implement only the feature requested in the issue; do not infer extra product work.
- Keep changes small, preserve app behavior, and use existing patterns.
- Run npm run verify and npm run build before opening a pull request.
- Never commit secrets, change production settings, or deploy directly.
- Use feat/<short-name> branches and open a pull request for review.
`,
  ".github/agents/feature-builder.agent.md": `---
name: Feature Builder
description: Implement an assigned feature issue, validate it, and open a pull request for review.
---

Read the assigned issue and relevant code first. Implement the requested behavior only. Add or update tests, run npm run verify and npm run build, then summarize the changes and open a pull request. Never deploy to production or add secrets.
`,
  ".github/ISSUE_TEMPLATE/feature.yml": `name: Feature request
description: Describe one small feature to be implemented by the remote coding agent.
title: "[Feature]: "
labels: [feature]
body:
  - type: textarea
    id: user-value
    attributes:
      label: What should the user be able to do?
      placeholder: "As a <user>, I can <action> so that <benefit>."
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Include observable behavior and any edge cases.
      placeholder: "Given ..., when ..., then ..."
    validations:
      required: true
  - type: textarea
    id: constraints
    attributes:
      label: Constraints or out of scope
`,
  ".github/workflows/copilot-setup-steps.yml": `name: Copilot Setup Steps

on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install
`,
  ".github/workflows/ci.yml": `name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install
      - run: npm run verify
      - run: npm run build
`,
  "app/layout.tsx": `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "New app",
  description: "A new app built with the factory",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "app/globals.css": `:root {
  color-scheme: light;
  font-family: Georgia, "Times New Roman", serif;
  background: #f4f5ef;
  color: #172f28;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; }
main { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }
h1 { font-size: 48px; font-weight: 500; }
p { color: #50665e; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
`,
  "app/page.tsx": `export default function Home() {
  return (
    <main>
      <p>NEW PROJECT</p>
      <h1>Your app starts here.</h1>
      <p>Describe one feature in a GitHub issue, then assign it to Copilot to build remotely and open a pull request.</p>
    </main>
  );
}
`,
  "app/api/health/route.ts": `export function GET() {
  return Response.json({ status: "ok" });
}
`,
  "README.md": `# New app

A Next.js app provisioned by AI Code Factory.

## Local development

\`npm install\`
\`npm run dev\`

## Feature workflow

1. Open a Feature request issue with clear acceptance criteria.
2. Assign the issue to GitHub Copilot coding agent.
3. Review the pull request Copilot opens; CI runs build and checks.
4. Merge when ready. Vercel Git integration deploys the app and creates previews.

Copilot coding agent must be enabled for the repository and your account must have an eligible Copilot plan. Vercel Hobby and GitHub usage limits apply.
`,
};
