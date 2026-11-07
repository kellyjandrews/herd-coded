"use client";

import { useEffect, useState } from "react";

type FactoryProject = {
  name: string;
  repository: string;
  repositoryUrl: string;
  httpsCloneUrl: string;
  sshCloneUrl: string;
  cloneCommand: string;
  productionUrl: string;
  createdAt?: string;
};

type ProjectsResponse = {
  configured?: boolean;
  projects?: FactoryProject[];
  error?: string;
};

export default function FactoryDashboard() {
  const [projects, setProjects] = useState<FactoryProject[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [featureRepo, setFeatureRepo] = useState<string | null>(null);
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDetails, setFeatureDetails] = useState("");
  const [featureMode, setFeatureMode] = useState<"single" | "csv">("single");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [submittingFeature, setSubmittingFeature] = useState(false);
  const [featureResults, setFeatureResults] = useState<
    Record<string, { number: number; url: string; batch?: boolean }>
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
        if (!response.ok) throw new Error(body.error ?? "Could not load projects.");
        setConfigured(Boolean(body.configured));
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
          <span className="workspace-avatar">K</span>
          <span className="workspace-copy">
            <strong>Kelly's workspace</strong>
            <small>Personal</small>
          </span>
          <span className="switcher-caret" aria-hidden="true">
            ⌄
          </span>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-label">WORKSPACE</p>
          <a className="nav-item nav-item-active" href="#projects">
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
          <a className="nav-item" href="#how-it-works">
            <span className="nav-icon" aria-hidden="true">
              ⌘
            </span>{" "}
            Templates
          </a>
          <a className="nav-item" href="#settings">
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>{" "}
            Settings
          </a>
        </nav>
        <div className="sidebar-footer">
          <span className="connection-dot" />
          <span>GitHub connected</span>
          <span className="connection-spacer" />
          <span className="connection-check">✓</span>
        </div>
      </aside>

      <section className="workspace" id="projects">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-divider">/</span>
            <strong>Projects</strong>
          </div>
          <div className="topbar-actions">
            <span className="auth-badge">
              <span className="auth-indicator" /> Private workspace
            </span>
            <button className="avatar-button" type="button" aria-label="Signed in as Kelly">
              K
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">
                APP FACTORY <span className="eyebrow-line" />
              </p>
              <h1 data-testid="hero-title">Projects</h1>
              <p className="heading-subtitle">
                Create an app workspace. Copilot can build the features in its GitHub repo.
              </p>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setFormOpen(true);
                setError("");
              }}
              disabled={configured === false}
            >
              <span className="button-plus" aria-hidden="true">
                +
              </span>{" "}
              New project
            </button>
          </section>

          <section className="stats-strip" aria-label="Workspace summary">
            <div className="stat-item">
              <span className="stat-label">PROJECTS</span>
              <strong>{loading ? "—" : projects.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">HOSTING</span>
              <strong className="stat-word">Vercel</strong>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">BUILD AGENT</span>
              <strong className="stat-word">
                Copilot <span className="remote-ready">REMOTE</span>
              </strong>
            </div>
            <div className="stat-spacer" />
            <div className="cost-note">
              <span className="cost-spark" aria-hidden="true">
                ✳
              </span>{" "}
              Free-tier setup
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

          <section className="projects-section" aria-labelledby="projects-title">
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
                  disabled={configured === false}
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
                        <h3>{project.name}</h3>
                        <span className="project-visibility">
                          <span aria-hidden="true">◈</span> GitHub
                        </span>
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
                            ? "Queued feature batch "
                            : "Copilot is working on "}
                          <a
                            href={featureResults[project.repository].url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            issue #{featureResults[project.repository].number}
                          </a>
                          {featureResults[project.repository].batch
                            ? ". The Feature queue workflow creates an issue per row and assigns Copilot one at a time."
                            : ". A pull request will appear in the repo."}
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
                                Header row: title,body,labels. Up to 50 rows. Requires the
                                COPILOT_ASSIGN_TOKEN secret in the repo.
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
                                maxLength={5000}
                                placeholder="What should users be able to do? Include acceptance criteria."
                                value={featureDetails}
                                onChange={(event) => setFeatureDetails(event.target.value)}
                              />
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
                                ? "Assigning…"
                                : featureMode === "csv"
                                  ? "Queue for Copilot"
                                  : "Assign to Copilot"}
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
                      <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
                        Repository <span aria-hidden="true">↗</span>
                      </a>
                      <a href={project.productionUrl} target="_blank" rel="noreferrer">
                        Vercel <span aria-hidden="true">↗</span>
                      </a>
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
                Open a feature issue in any project repo, describe the requested behavior and
                acceptance criteria, then assign it to GitHub Copilot. It works in a remote
                environment and opens a pull request for review.
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
