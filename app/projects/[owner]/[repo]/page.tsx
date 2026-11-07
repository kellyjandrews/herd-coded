import Link from "next/link";
import { notFound } from "next/navigation";
import { providerCredentialsConfigured, usingMocks } from "@/lib/server/github";
import { getProjectActivity } from "@/lib/server/project-activity";
import type { ProjectActivity } from "@/lib/server/types";
import AutoRefresh from "./auto-refresh";
import FeatureTable from "./feature-table";
import ProductionCard from "./production-card";
import QueuePanel from "./queue-panel";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  let activity: ProjectActivity | null = null;
  let loadError = "";
  if (!usingMocks() && !providerCredentialsConfigured()) {
    loadError = "Project provisioning is not configured on this factory.";
  } else {
    try {
      activity = await getProjectActivity(owner, repo);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Could not load this project.";
    }
  }
  if (!loadError && !activity) notFound();

  return (
    <main className="detail-shell">
      <div className="page-content">
        <Link className="back-link" href="/">
          ← Projects
        </Link>
        {activity ? (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">
                  PROJECT <span className="eyebrow-line" />
                </p>
                <h1 data-testid="project-title">{activity.project.name}</h1>
                <p className="heading-subtitle">
                  {activity.project.repository}
                  {activity.project.visibility && ` · ${activity.project.visibility}`}
                </p>
              </div>
              <div className="detail-links">
                <a href={activity.project.repositoryUrl} target="_blank" rel="noreferrer">
                  Repository <span aria-hidden="true">↗</span>
                </a>
                {activity.project.productionUrl ? (
                  <a href={activity.project.productionUrl} target="_blank" rel="noreferrer">
                    Production <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="not-deployed" data-testid="not-deployed">
                    Not deployed yet
                  </span>
                )}
                <AutoRefresh />
              </div>
            </section>
            <ProductionCard production={activity.production} />
            <QueuePanel repository={activity.project.repository} queue={activity.queue} />
            <FeatureTable features={activity.features} />
          </>
        ) : (
          <div className="notice notice-error" role="alert">
            <span>!</span>
            <p>{loadError}</p>
          </div>
        )}
      </div>
    </main>
  );
}
