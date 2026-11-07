import type { ProductionStatus, Section } from "@/lib/server/types";

const stateLabels: Record<ProductionStatus["state"], string> = {
  READY: "Ready",
  BUILDING: "Building",
  QUEUED: "Queued",
  ERROR: "Error",
  CANCELED: "Canceled",
  UNKNOWN: "Unknown",
};

export default function ProductionCard({ production }: { production: Section<ProductionStatus> }) {
  return (
    <section className="detail-card" aria-labelledby="production-title" data-testid="production">
      <div className="section-heading">
        <h2 id="production-title">Production</h2>
      </div>
      {production.ok ? (
        <div className="production-row">
          <span className={`status-pill status-${production.data.state.toLowerCase()}`}>
            {stateLabels[production.data.state]}
          </span>
          <a href={production.data.url} target="_blank" rel="noreferrer">
            {production.data.url.replace(/^https:\/\//, "")}
          </a>
          {production.data.sha && <code>{production.data.sha.slice(0, 7)}</code>}
          {production.data.createdAt && (
            <time dateTime={production.data.createdAt}>
              {new Date(production.data.createdAt).toLocaleString("en-US")}
            </time>
          )}
          {production.data.inspectorUrl && (
            <a href={production.data.inspectorUrl} target="_blank" rel="noreferrer">
              Build logs ↗
            </a>
          )}
        </div>
      ) : (
        <p className="section-error" role="status">
          {production.error}
        </p>
      )}
    </section>
  );
}
