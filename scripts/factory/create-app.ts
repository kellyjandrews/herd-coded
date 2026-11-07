import { spawn } from "node:child_process";
import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

interface CommandOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  input?: string;
}

const factoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const excludedDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  ".terraform",
  "coverage",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

function runCommand(command: string, args: string[], options: CommandOptions = {}): Promise<void> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "inherit", "inherit"],
    });

    child.stdin.end(options.input ?? "");
    child.on("error", rejectCommand);
    child.on("close", (code) => {
      if (code === 0) {
        resolveCommand();
      } else {
        rejectCommand(new Error(`${command} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

function captureCommand(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
): Promise<string> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let errorOutput = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      errorOutput += chunk;
    });
    child.on("error", rejectCommand);
    child.on("close", (code) => {
      if (code === 0) {
        resolveCommand(output.trim());
      } else {
        rejectCommand(
          new Error(errorOutput.trim() || `${command} exited with code ${code ?? "unknown"}`),
        );
      }
    });
  });
}

function readSecret(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error("Run this command from an interactive terminal to enter the Vercel token."),
    );
  }

  return new Promise((resolveSecret, rejectSecret) => {
    let secret = "";
    const wasRaw = stdin.isRaw;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
      if (error) {
        rejectSecret(error);
      } else {
        resolveSecret(secret);
      }
    };

    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          secret = secret.slice(0, -1);
        } else {
          secret += character;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isInside(parent: string, candidate: string): boolean {
  const relativePath = relative(parent, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath))
  );
}

function shouldCopy(sourcePath: string): boolean {
  const relativePath = relative(factoryRoot, sourcePath);
  if (!relativePath) return true;

  const segments = relativePath.split(sep);
  const filename = segments.at(-1) ?? "";
  if (segments.some((segment) => excludedDirectories.has(segment))) return false;
  if (
    relativePath.startsWith(`specs${sep}`) &&
    !relativePath.startsWith(`specs${sep}_template${sep}`)
  )
    return false;
  if (relativePath.startsWith(`infra${sep}terraform${sep}`)) return false;
  if (filename === ".env" || (filename.startsWith(".env.") && filename.endsWith(".local")))
    return false;
  if (filename === "terraform.tfvars" || filename.includes(".tfstate")) return false;
  if (relativePath === "tsconfig.tsbuildinfo" || relativePath === "scripts/factory/create-app.ts")
    return false;
  return true;
}

async function personalizeApp(appDirectory: string, appName: string): Promise<void> {
  const packagePath = join(appDirectory, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    name: string;
    scripts?: Record<string, string>;
  };
  packageJson.name = appName;
  delete packageJson.scripts?.["create-app"];
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const lockPath = join(appDirectory, "package-lock.json");
  if (await pathExists(lockPath)) {
    const packageLock = JSON.parse(await readFile(lockPath, "utf8")) as {
      name?: string;
      packages?: Record<string, { name?: string }>;
    };
    packageLock.name = appName;
    if (packageLock.packages?.[""]) packageLock.packages[""].name = appName;
    await writeFile(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
  }

  const readme = `# ${appName}\n\nA Next.js app scaffolded with AI Code Factory.\n\n## Local development\n\n\`npm ci\`\n\n\`npm run dev\`\n\nOpen http://localhost:3000.\n\n## Verification\n\n\`npm run verify\`\n\n\`npm run build\`\n`;
  await writeFile(join(appDirectory, "README.md"), readme);
}

async function main(): Promise<void> {
  await runCommand("gh", ["auth", "status"]);
  const githubOwner = await captureCommand("gh", ["api", "user", "--jq", ".login"], factoryRoot);

  const readline = createInterface({ input: stdin, output: stdout });
  const ask = async (label: string, defaultValue = "") => {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const response = (await readline.question(`${label}${suffix}: `)).trim();
    return response || defaultValue;
  };

  const appName = await ask("New app name (lowercase-dashes)");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(appName) || appName.length > 100) {
    readline.close();
    throw new Error("Use a GitHub-compatible name: lowercase letters, numbers, and single dashes.");
  }
  const owner = await ask("GitHub owner", githubOwner);
  const visibility = (await ask("Repository visibility (private/public)", "private")).toLowerCase();
  const description = await ask("Short app description");
  const parentDirectory = resolve(factoryRoot, await ask("Local parent directory", ".."));
  const vercelScope = await ask("Vercel team slug (blank uses the CLI default)");
  const productionUrl = await ask("Production URL", `https://${appName}.vercel.app`);
  readline.close();

  if (visibility !== "private" && visibility !== "public") {
    throw new Error("Repository visibility must be private or public.");
  }

  const appDirectory = join(parentDirectory, appName);
  if (isInside(factoryRoot, appDirectory)) {
    throw new Error("Choose a destination outside the factory repository.");
  }
  if (await pathExists(appDirectory)) {
    throw new Error(`Local destination already exists: ${appDirectory}`);
  }

  const githubRepository = `${owner}/${appName}`;
  try {
    await captureCommand("gh", ["repo", "view", githubRepository, "--json", "name"], factoryRoot);
    throw new Error(`GitHub repository already exists: ${githubRepository}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GitHub repository already exists:"))
      throw error;
  }

  const token = await readSecret("Vercel access token (input hidden): ");
  if (!token.trim()) throw new Error("A Vercel token is required.");
  const vercelEnvironment = { VERCEL_TOKEN: token };
  const vercelScopeArgs = vercelScope ? ["--scope", vercelScope] : [];

  try {
    await captureCommand("npx", ["vercel", "whoami"], factoryRoot, vercelEnvironment);
    try {
      await captureCommand(
        "npx",
        ["vercel", "project", "inspect", appName, "--json", ...vercelScopeArgs],
        factoryRoot,
        vercelEnvironment,
      );
      throw new Error(`Vercel project already exists: ${appName}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Vercel project already exists:"))
        throw error;
    }

    await mkdir(parentDirectory, { recursive: true });
    await cp(factoryRoot, appDirectory, {
      recursive: true,
      filter: shouldCopy,
    });
    await personalizeApp(appDirectory, appName);
    await runCommand("git", ["init", "-b", "main"], { cwd: appDirectory });
    await runCommand("git", ["add", "-A"], { cwd: appDirectory });
    await runCommand("git", ["commit", "-m", `chore: scaffold ${appName}`], {
      cwd: appDirectory,
    });

    const repoArgs = [
      "repo",
      "create",
      githubRepository,
      `--${visibility}`,
      "--source",
      appDirectory,
      "--remote",
      "origin",
      "--push",
    ];
    if (description) repoArgs.push("--description", description);
    await runCommand("gh", repoArgs, { cwd: appDirectory });

    await runCommand("npx", ["vercel", "project", "create", appName, "--yes", ...vercelScopeArgs], {
      cwd: appDirectory,
      env: vercelEnvironment,
    });
    await runCommand("npx", ["vercel", "link", "--yes", "--project", appName, ...vercelScopeArgs], {
      cwd: appDirectory,
      env: vercelEnvironment,
    });
    await runCommand(
      "npx",
      [
        "vercel",
        "project",
        "update",
        "--framework",
        "nextjs",
        "--auto-detect",
        "output-directory",
        "--yes",
        ...vercelScopeArgs,
      ],
      { cwd: appDirectory, env: vercelEnvironment },
    );

    const project = JSON.parse(
      await readFile(join(appDirectory, ".vercel", "project.json"), "utf8"),
    ) as {
      orgId?: string;
      projectId?: string;
    };
    if (!project.orgId || !project.projectId)
      throw new Error("Vercel project link did not return org and project IDs.");

    await runCommand("gh", ["secret", "set", "VERCEL_TOKEN", "--repo", githubRepository], {
      input: `${token}\n`,
    });
    await runCommand("gh", [
      "variable",
      "set",
      "VERCEL_ORG_ID",
      "--body",
      project.orgId,
      "--repo",
      githubRepository,
    ]);
    await runCommand("gh", [
      "variable",
      "set",
      "VERCEL_PROJECT_ID",
      "--body",
      project.projectId,
      "--repo",
      githubRepository,
    ]);
    await runCommand("gh", [
      "variable",
      "set",
      "PRODUCTION_URL",
      "--body",
      productionUrl,
      "--repo",
      githubRepository,
    ]);

    console.log("\nCreating factory labels in the new repo...");
    const labels = [
      ["factory", "c084fc", "AI code factory work"],
      ["feature", "0052cc", "Feature to build"],
      ["bug", "d93f0b", "Confirmed product defect"],
      ["incident", "b60205", "Runtime incident requiring triage"],
    ];
    for (const [label, color, labelDescription] of labels) {
      await runCommand("gh", [
        "label",
        "create",
        label,
        "--color",
        color,
        "--description",
        labelDescription,
        "--force",
        "--repo",
        githubRepository,
      ]);
    }

    console.log(`\nCreated ${githubRepository}`);
    console.log(`Local app: ${appDirectory}`);
    console.log(`Production URL: ${productionUrl}`);
    console.log("GitHub Actions will build and deploy after the initial push.");
    console.log(`Next: cd "${appDirectory}" && npm ci && npm run dev`);
  } finally {
    vercelEnvironment.VERCEL_TOKEN = "";
  }
}

main().catch((error: unknown) => {
  console.error(
    `App creation stopped: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
