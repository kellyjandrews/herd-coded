"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FactoryProject = {
  name: string;
  repository: string;
  repositoryUrl: string;
  httpsCloneUrl: string;
  sshCloneUrl: string;
  cloneCommand: string;
  productionUrl?: string;
  createdAt?: string;
  visibility?: "private" | "public";
  repairSteps?: string[];
};

type ProjectsResponse = {
  configured?: boolean;
  mock?: boolean;
  owner?: string;
  projects?: FactoryProject[];
  error?: string;
};

const requiredSettings = [
  "FACTORY_BASIC_AUTH_USERNAME",
  "FACTORY_BASIC_AUTH_PASSWORD",
  "FACTORY_GITHUB_OWNER",
  "FACTORY_GITHUB_TOKEN",
  "VERCEL_ACCESS_TOKEN",
];

export default function FactoryDashboard() {
  const [projects, setProjects] = useState<FactoryProject[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mock, setMock] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [featureRepo, setFeatureRepo] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDetails, setFeatureDetails] = useState("");
  const [featureMode, setFeatureMode] = useState<"single" | "csv">("single");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [submittingFeature, setSubmittingFeature] = useState(false);
  const [featureResults, setFeatureResults] = useState<
    Record<
      string,
      {
        number: number;
        url: string;
        batch?: boolean;
      }
    >
  >({});

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects(signal: AbortSignal) {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/projects", {
          cache: "no-store",
          credentials: "same-origin",
          signal,
        });
        const body = (await response.json()) as ProjectsResponse;
        setOwner(body.owner ?? null);
        if (!response.ok) throw new Error(body.error ?? "Could not load projects.");
        setConfigured(Boolean(body.configured));
        setMock(Boolean(body.mock));
        setProjects(body.projects ?? []);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Could not load projects.");
      } finally {
        setLoading(false);
      }
    }

    void loadProjects(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (formOpen) projectNameRef.current?.focus();
  }, [formOpen]);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, visibility }),
      });
      const body = (await response.json()) as {
        project?: FactoryProject;
        partialProject?: FactoryProject;
        error?: string;
      };
      if (!response.ok) {
        const partial = body.partialProject;
        if (partial) setProjects((current) => [partial, ...current]);
        throw new Error(body.error ?? "Project creation failed.");
      }
      const created = body.project;
      if (created)
        setProjects((current) => [
          created,
          ...current.filter((project) => project.repository !== created.repository),
        ]);
      setName("");
      setDescription("");
      setVisibility("private");
      setFormOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Project creation failed.");
    } finally {
      setCreating(false);
    }
  }

  async function submitFeature(event: React.FormEvent<HTMLFormElement>, repository: string) {
    event.preventDefault();
    setSubmittingFeature(true);
    setError("");
    try {
      const payload =
        featureMode === "csv" && csvFile
          ? { repository, fileName: csvFile.name, csv: await csvFile.text() }
          : { repository, title: featureTitle, details: featureDetails };
      const response = await fetch("/api/features", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        issue?: { number: number; url: string };
        batch?: boolean;
        error?: string;
      };
      const issue = body.issue;
      if (!response.ok || !issue)
        throw new Error(body.error ?? "Could not create the feature issue.");
      setFeatureResults((current) => ({
        ...current,
        [repository]: { ...issue, batch: body.batch },
      }));
      setFeatureTitle("");
      setFeatureDetails("");
      setCsvFile(null);
      setFeatureRepo(null);
    } catch (featureError) {
      setError(
        featureError instanceof Error
          ? featureError.message
          : "Could not create the feature issue.",
      );
    } finally {
      setSubmittingFeature(false);
    }
  }

  async function repairProject(project: FactoryProject) {
    setRepairing(project.repository);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.repository}/repair`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await response.json()) as {
        project?: FactoryProject;
        error?: string;
      };
      if (!response.ok || !body.project) throw new Error(body.error ?? "Repair failed.");
      const repaired = body.project;
      setProjects((current) =>
        current.map((item) => (item.repository === repaired.repository ? repaired : item)),
      );
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : "Repair failed.");
    } finally {
      setRepairing(null);
    }
  }

  async function copyCloneRoute(project: FactoryProject) {
    try {
      await navigator.clipboard.writeText(project.cloneCommand);
      setCopied(project.repository);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError(`Clipboard access was blocked. Clone with: ${project.cloneCommand}`);
    }
  }

  return (
    <main className="factory-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Factory home">
          <span className="brand-mark">F</span>
          <span>
            factory<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">{(owner ?? "F").slice(0, 1).toUpperCase()}</span>
          <span className="workspace-copy">
            <strong>{owner ?? "Factory workspace"}</strong>
            <small>GitHub owner</small>
          </span>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-label">WORKSPACE</p>
          <a className="nav-item nav-item-active" href="#project-list">
            <span className="nav-icon" aria-hidden="true">
              ▦
            </span>{" "}
            Projects <span className="nav-count">{projects.length}</span>
          </a>
          <a className="nav-item nav-item-muted" href="#remote-builds">
            <span className="nav-icon" aria-hidden="true">
              ↗
            </span>{" "}
            Remote builds
          </a>
          <p className="nav-label nav-label-spaced">FACTORY</p>
          <a className="nav-item" href="#settings">
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>{" "}
            Setup
          </a>
        </nav>
        <div className="sidebar-footer" data-testid="connection-status">
          <span className={`connection-dot ${configured === true ? "" : "connection-dot-off"}`} />
          <span>
            {configured === null
              ? "Checking GitHub…"
              : configured
                ? "GitHub connected"
                : "GitHub not configured"}
          </span>
          <span className="connection-spacer" />
          {configured && <span className="connection-check">✓</span>}
        </div>
      </aside>

      <section className="workspace" id="projects">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-divider">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <span className="auth-badge">
              <span className="auth-indicator" /> Private workspace
            </span>
            <span className="avatar-button" title={owner ?? undefined} aria-hidden="true">
              {(owner ?? "F").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <h1 data-testid="hero-title">What would you like to work on?</h1>
              <p className="heading-subtitle">
                Start a feature request or check in on your projects.
              </p>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setFormOpen(true);
                setError("");
              }}
              disabled={configured !== true}
            >
              <span className="button-plus" aria-hidden="true">
                +
              </span>{" "}
              New project
            </button>
          </section>

          <section className="start-panel" aria-label="Get started">
            <div className="start-feature">
              <h2>Create a feature request</h2>
              <p>Choose a project and describe what you want to build.</p>
              {loading ? (
                <p className="start-hint" role="status">
                  Loading projects…
                </p>
              ) : projects.length > 0 ? (
                <div className="start-controls">
                  <label className="sr-only" htmlFor="feature-project">
                    Choose a project for your feature request
                  </label>
                  <select
                    id="feature-project"
                    value={selectedProject}
                    onChange={(event) => setSelectedProject(event.target.value)}
                  >
                    <option value="">Choose a project</option>
                    {projects.map((project) => (
                      <option key={project.repository} value={project.repository}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {selectedProject ? (
                    <Link
                      className="button button-primary"
                      href={`/projects/${selectedProject}#new-feature`}
                    >
                      Continue <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <button className="button button-primary" type="button" disabled>
                      Continue <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              ) : (
                <p className="start-hint">
                  {configured === null
                    ? "Projects are unavailable. Refresh the page to try again."
                    : "Create a project first to request a feature."}
                </p>
              )}
            </div>
            <div className="start-projects">
              <h2>Explore your projects</h2>
              <p>See your projects, open their activity, or visit the live app.</p>
              <a className="button button-secondary" href="#project-list">
                View all projects <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>

          {error && (
            <div className="notice notice-error" role="alert">
              <span>!</span>
              <p>{error}</p>
              <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {mock && (
            <div className="notice notice-setup" role="status" data-testid="mock-mode">
              <span>i</span>
              <p>Demo mode: projects and Copilot activity are mock data (USE_MOCKS=true).</p>
            </div>
          )}
          {configured === false && (
            <div className="notice notice-setup" role="status">
              <span>i</span>
              <p>
                Project creation is not configured yet. Add the factory provider credentials in
                Vercel project settings to enable it.
              </p>
              <a href="#settings">Setup details</a>
            </div>
          )}

          {formOpen && (
            <section className="create-panel" aria-labelledby="create-title">
              <div className="create-panel-heading">
                <div>
                  <p className="eyebrow">NEW WORKSPACE</p>
                  <h2 id="create-title">Create a project</h2>
                </div>
                <button
                  className="close-button"
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>
              <form onSubmit={createProject}>
                <label className="field-label" htmlFor="project-name">
                  Project name
                </label>
                <input
                  ref={projectNameRef}
                  id="project-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="my-next-app"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <p className="field-hint">
                  Lowercase letters, numbers, and dashes. This becomes the GitHub repo and Vercel
                  project name.
                </p>
                <label className="field-label" htmlFor="project-description">
                  Description <span>OPTIONAL</span>
                </label>
                <textarea
                  id="project-description"
                  name="description"
                  rows={2}
                  maxLength={350}
                  placeholder="A short note about this app"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <fieldset className="visibility-fieldset">
                  <legend className="field-label">Repository visibility</legend>
                  <div className="visibility-options">
                    <label
                      className={`visibility-option ${visibility === "private" ? "visibility-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={visibility === "private"}
                        onChange={() => setVisibility("private")}
                      />
                      <span className="visibility-icon" aria-hidden="true">
                        ◈
                      </span>
                      <span>
                        <strong>Private</strong>
                        <small>Only you and collaborators</small>
                      </span>
                    </label>
                    <label
                      className={`visibility-option ${visibility === "public" ? "visibility-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={visibility === "public"}
                        onChange={() => setVisibility("public")}
                      />
                      <span className="visibility-icon" aria-hidden="true">
                        ◎
                      </span>
                      <span>
                        <strong>Public</strong>
                        <small>Visible on GitHub</small>
                      </span>
                    </label>
                  </div>
                </fieldset>
                <div className="create-actions">
                  <span>Creates a GitHub repo and linked Vercel project.</span>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={creating || !name}
                  >
                    {creating ? (
                      <>
                        <span className="spinner" /> Creating…
                      </>
                    ) : (
                      "Create project"
                    )}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="projects-section" id="project-list" aria-labelledby="projects-title">
            <div className="section-heading">
              <h2 id="projects-title">Your projects</h2>
              <span className="section-count">
                {loading ? "Loading" : `${projects.length} total`}
              </span>
            </div>
            {loading ? (
              <div className="loading-row">
                <span className="spinner spinner-dark" /> Loading projects…
              </div>
            ) : configured === null ? (
              <p className="section-empty">
                Could not load projects. Refresh the page to try again.
              </p>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-art" aria-hidden="true">
                  <span className="empty-window">
                    <i />
                    <i />
                    <i />
                    <b>⌘</b>
                  </span>
                  <span className="empty-plus">+</span>
                </div>
                <h3>Your next app starts here.</h3>
                <p>
                  Create a project to get a GitHub repo, a Vercel project, and a clone route. Assign
                  a feature issue to Copilot to build remotely.
                </p>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setFormOpen(true);
                    setError("");
                  }}
                  disabled={configured !== true}
                >
                  Create your first project <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <div className="project-list">
                {projects.map((project) => (
                  <article className="project-row" key={project.repository}>
                    <div className="project-monogram">{project.name.slice(0, 1).toUpperCase()}</div>
                    <div className="project-main">
                      <div className="project-title-line">
                        <h3>
                          <Link href={`/projects/${project.repository}`}>{project.name}</Link>
                        </h3>
                        <span className="project-visibility">
                          <span aria-hidden="true">◈</span>{" "}
                          {project.visibility === "public"
                            ? "Public"
                            : project.visibility === "private"
                              ? "Private"
                              : "GitHub"}
                        </span>
                        {project.repairSteps && project.repairSteps.length > 0 && (
                          <span
                            className="repair-badge"
                            title={`Missing: ${project.repairSteps.join(", ")}`}
                            data-testid="needs-repair"
                          >
                            Needs repair
                          </span>
                        )}
                      </div>
                      <p>{project.repository}</p>
                      <div className="clone-route">
                        <code>{project.cloneCommand}</code>
                        <button
                          type="button"
                          onClick={() => void copyCloneRoute(project)}
                          aria-label={`Copy clone command for ${project.name}`}
                          title="Copy clone command"
                        >
                          {copied === project.repository ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {featureResults[project.repository] && (
                        <p className="feature-result">
                          {featureResults[project.repository].batch
                            ? "Submitted feature batch "
                            : "Created "}
                          <a
                            href={featureResults[project.repository].url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            issue #{featureResults[project.repository].number}
                          </a>
                          {featureResults[project.repository].batch
                            ? ". The Feature queue workflow creates an issue per row; approve them on the project page."
                            : ". Approve it on the project page to start Copilot."}{" "}
                          <Link href={`/projects/${project.repository}`}>Review and approve →</Link>
                        </p>
                      )}
                      {featureRepo === project.repository ? (
                        <form
                          className="feature-form"
                          onSubmit={(event) => void submitFeature(event, project.repository)}
                        >
                          <fieldset className="feature-mode" aria-label="Feature input">
                            <button
                              className="button button-secondary"
                              type="button"
                              aria-pressed={featureMode === "single"}
                              onClick={() => setFeatureMode("single")}
                            >
                              Single feature
                            </button>
                            <button
                              className="button button-secondary"
                              type="button"
                              aria-pressed={featureMode === "csv"}
                              onClick={() => setFeatureMode("csv")}
                            >
                              CSV batch
                            </button>
                          </fieldset>
                          {featureMode === "csv" ? (
                            <>
                              <input
                                aria-label="Feature CSV file"
                                type="file"
                                accept=".csv,text/csv"
                                required
                                onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                              />
                              <p className="field-hint">
                                Header row: title,body,labels. Up to 50 rows. Each row awaits
                                approval, then Copilot builds them one at a time.
                              </p>
                            </>
                          ) : (
                            <>
                              <input
                                aria-label="Feature title"
                                required
                                maxLength={200}
                                placeholder="Feature title"
                                value={featureTitle}
                                onChange={(event) => setFeatureTitle(event.target.value)}
                              />
                              <textarea
                                aria-label="Feature details"
                                required
                                rows={4}
                                maxLength={60000}
                                placeholder="What should users be able to do? Include acceptance criteria."
                                value={featureDetails}
                                onChange={(event) => setFeatureDetails(event.target.value)}
                              />
                              <p className="field-hint">
                                Markdown is supported. Maximum 60,000 characters.
                              </p>
                            </>
                          )}
                          <div className="create-actions">
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setFeatureRepo(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="button button-primary"
                              type="submit"
                              disabled={submittingFeature}
                            >
                              {submittingFeature
                                ? "Submitting…"
                                : featureMode === "csv"
                                  ? "Submit batch for approval"
                                  : "Submit for approval"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => {
                            setFeatureRepo(project.repository);
                            setError("");
                          }}
                        >
                          + New feature
                        </button>
                      )}
                    </div>
                    <div className="project-links">
                      <Link href={`/projects/${project.repository}`}>
                        Open project <span aria-hidden="true">→</span>
                      </Link>
                      <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
                        Repository <span aria-hidden="true">↗</span>
                      </a>
                      {project.productionUrl ? (
                        <a href={project.productionUrl} target="_blank" rel="noreferrer">
                          Production <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="not-deployed" data-testid="not-deployed">
                          Not deployed yet
                        </span>
                      )}
                      {project.repairSteps && project.repairSteps.length > 0 && (
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={repairing === project.repository}
                          onClick={() => void repairProject(project)}
                        >
                          {repairing === project.repository ? "Repairing…" : "Repair"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="remote-section" id="remote-builds">
            <div className="remote-icon" aria-hidden="true">
              ↗
            </div>
            <div>
              <h2>Build remotely with Copilot</h2>
              <p>
                Add a feature here or open a feature issue in any project repo, then approve it on
                the project page. Copilot builds approved features one at a time in a remote
                environment, and pull requests that pass CI merge and deploy automatically.
              </p>
            </div>
            <a
              href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue"
              target="_blank"
              rel="noreferrer"
            >
              How it works <span aria-hidden="true">↗</span>
            </a>
          </section>
          <section className="remote-section" id="settings" aria-labelledby="setup-title">
            <div className="remote-icon" aria-hidden="true">
              ⚙
            </div>
            <div>
              <h2 id="setup-title">Setup</h2>
              <p>
                Set these environment variables in the factory's Vercel project settings (or
                <code> .env.local</code> for local development). <code>VERCEL_TEAM_ID</code> is
                optional for personal Vercel accounts.
              </p>
              <ul className="setup-list">
                {requiredSettings.map((setting) => (
                  <li key={setting}>
                    <code>{setting}</code>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <footer className="page-footer">
            <span>
              AI CODE FACTORY <span>·</span> HACKATHON WORKSPACE
            </span>
            <span>Protected with Basic Auth</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
