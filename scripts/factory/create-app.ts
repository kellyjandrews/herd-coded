import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const factoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", rejectCommand);
    child.on("close", (code) => {
      if (code === 0) resolveCommand();
      else rejectCommand(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

function captureCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { cwd: factoryRoot, stdio: ["ignore", "pipe", "pipe"] });
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
      if (code === 0) resolveCommand(output.trim());
      else
        rejectCommand(
          new Error(errorOutput.trim() || `${command} exited with code ${code ?? "unknown"}`),
        );
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
      if (error) rejectSecret(error);
      else resolveSecret(secret);
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
        if (character === "\u007f" || character === "\b") secret = secret.slice(0, -1);
        else secret += character;
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

async function main(): Promise<void> {
  // Same provisioning as the dashboard, so both paths produce the same app.
  nextEnv.loadEnvConfig(factoryRoot);
  process.env.FACTORY_GITHUB_TOKEN ||= await captureCommand("gh", ["auth", "token"]);
  const githubLogin = await captureCommand("gh", ["api", "user", "--jq", ".login"]);

  const readline = createInterface({ input: stdin, output: stdout });
  const ask = async (label: string, defaultValue = "") => {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const response = (await readline.question(`${label}${suffix}: `)).trim();
    return response || defaultValue;
  };

  const name = await ask("New app name (lowercase-dashes)");
  const owner = await ask("GitHub owner", process.env.FACTORY_GITHUB_OWNER || githubLogin);
  const visibility = (await ask("Repository visibility (private/public)", "private")).toLowerCase();
  const description = await ask("Short app description");
  const parentDirectory = resolve(factoryRoot, await ask("Local parent directory", ".."));
  readline.close();

  if (visibility !== "private" && visibility !== "public") {
    throw new Error("Repository visibility must be private or public.");
  }
  const appDirectory = join(parentDirectory, name);
  if (isInside(factoryRoot, appDirectory)) {
    throw new Error("Choose a destination outside the factory repository.");
  }
  if (await pathExists(appDirectory)) {
    throw new Error(`Local destination already exists: ${appDirectory}`);
  }

  process.env.FACTORY_GITHUB_OWNER = owner;
  if (!process.env.VERCEL_ACCESS_TOKEN) {
    process.env.VERCEL_ACCESS_TOKEN = await readSecret("Vercel access token (input hidden): ");
  }

  const { provisionProject } = await import("@/lib/server/provision-project");
  const project = await provisionProject({ name, description, visibility });
  await runCommand("gh", ["repo", "clone", project.repository, appDirectory], factoryRoot);

  console.log(`\nCreated ${project.repository}`);
  console.log(`Local app: ${appDirectory}`);
  console.log(`Production URL: ${project.productionUrl}`);
  if (project.repairSteps?.length) {
    console.log(`Needs repair from the dashboard: ${project.repairSteps.join(", ")}`);
  }
  console.log(`Next: cd "${appDirectory}" && npm install && npm run dev`);
}

main().catch((error: unknown) => {
  console.error(
    `App creation stopped: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
