const api = "https://api.github.com";
const token = process.env.GH_TOKEN;
const repo = process.env.REPO;
const batchLabel = "feature-batch";
const queueLabel = "feature-queue";
const maxRows = 50;
const attachmentPrefix = "https://github.com/user-attachments/files/";
const fence = "```";

if (!token) {
  console.error(
    "Add a COPILOT_ASSIGN_TOKEN repository secret: a fine-grained PAT with Issues, Pull requests, Contents, and Actions read/write.",
  );
  process.exit(1);
}

async function gh(path, init = {}) {
  const response = await fetch(api + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      "GitHub API " +
        response.status +
        " " +
        path +
        ": " +
        (await response.text()),
    );
  }
  return response.status === 204 ? null : response.json();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((value) => value.trim()));
}

async function readCsv(body) {
  const start = body.indexOf(attachmentPrefix);
  if (start >= 0) {
    let end = start;
    while (end < body.length && !" )>\n\r\t".includes(body[end])) end++;
    const url = body.slice(start, end);
    if (url.toLowerCase().endsWith(".csv")) {
      // Token goes only to github.com; the signed storage redirect is fetched without it.
      const response = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
        redirect: "manual",
      });
      const location = response.headers.get("location");
      const file = location ? await fetch(location) : response;
      if (
        file.ok &&
        !(file.headers.get("content-type") ?? "").includes("text/html")
      ) {
        return file.text();
      }
    }
  }
  // Fallback for private repos where the attachment can't be downloaded.
  const open = body.indexOf(fence + "csv");
  if (open >= 0) {
    const from = body.indexOf("\n", open) + 1;
    const close = body.indexOf(fence, from);
    if (from > 0 && close > from) return body.slice(from, close);
  }
  return null;
}

async function fail(issueNumber, message) {
  await gh("/repos/" + repo + "/issues/" + issueNumber + "/comments", {
    method: "POST",
    body: JSON.stringify({ body: message }),
  });
  throw new Error(message);
}

async function importBatch() {
  const number = process.env.ISSUE_NUMBER;
  const issue = await gh("/repos/" + repo + "/issues/" + number);
  if (
    issue.state !== "open" ||
    !issue.labels.some((label) => label.name === batchLabel)
  )
    return;

  const access = await gh(
    "/repos/" + repo + "/collaborators/" + issue.user.login + "/permission",
  );
  if (!["admin", "write"].includes(access.permission)) {
    await fail(
      number,
      "Only collaborators with write access can queue feature batches.",
    );
  }

  const csv = await readCsv(issue.body ?? "");
  if (!csv) {
    await fail(
      number,
      "Could not read the CSV. Attach a .csv file, or paste the CSV in a csv code block, then remove and re-add the feature-batch label.",
    );
  }
  const rows = parseCsv(csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv);
  const header = (rows.shift() ?? []).map((name) => name.trim().toLowerCase());
  const column = (name) => header.indexOf(name);
  if (column("title") < 0) {
    await fail(
      number,
      "The first CSV row must be a header with title, body, and optional labels columns.",
    );
  }
  if (rows.length > maxRows) {
    await fail(
      number,
      "Split the CSV into batches of " + maxRows + " rows or fewer.",
    );
  }
  const cell = (row, name) =>
    column(name) >= 0 ? (row[column(name)] ?? "").trim() : "";

  const created = [];
  for (const row of rows) {
    const title = cell(row, "title").slice(0, 256);
    if (!title) continue;
    const body = cell(row, "body");
    const labels = cell(row, "labels")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    const featureIssue = await gh("/repos/" + repo + "/issues", {
      method: "POST",
      body: JSON.stringify({
        title,
        body: (body ? body + "\n\n" : "") + "Queued from #" + number + ".",
        labels: [...new Set(["feature", queueLabel, ...labels])],
      }),
    });
    created.push("- #" + featureIssue.number + " " + title);
  }

  await gh("/repos/" + repo + "/issues/" + number + "/comments", {
    method: "POST",
    body: JSON.stringify({
      body:
        "Queued " +
        created.length +
        " feature issues. Copilot works them in order, one at a time.\n\n" +
        created.join("\n"),
    }),
  });
  await gh("/repos/" + repo + "/issues/" + number, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
}

async function startNext() {
  const queued = (
    await gh(
      "/repos/" +
        repo +
        "/issues?state=open&labels=" +
        queueLabel +
        "&sort=created&direction=asc&per_page=100",
    )
  ).filter((issue) => !issue.pull_request);
  if (
    queued.some((issue) =>
      issue.assignees.some((a) => a.login.toLowerCase().includes("copilot")),
    )
  ) {
    console.log("A queued feature is already assigned to Copilot.");
    return;
  }
  const next = queued[0];
  if (!next) {
    console.log("Feature queue is empty.");
    return;
  }
  const { default_branch } = await gh("/repos/" + repo);
  await gh("/repos/" + repo + "/issues/" + next.number + "/assignees", {
    method: "POST",
    body: JSON.stringify({
      assignees: ["copilot-swe-agent[bot]"],
      agent_assignment: {
        target_repo: repo,
        base_branch: default_branch,
        custom_instructions:
          "Implement only this issue, run npm run verify and npm run build, and open a pull request that closes it.",
      },
    }),
  });
  console.log("Assigned #" + next.number + " to Copilot.");
}

const commands = { import: importBatch, next: startNext };
const command = commands[process.argv[2]];
if (!command) {
  console.error("Usage: node feature-queue.mjs import|next");
  process.exit(1);
}
await command();
