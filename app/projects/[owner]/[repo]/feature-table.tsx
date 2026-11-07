import type { CheckStatus, FeatureItem, FeatureState, Section } from "@/lib/server/types";

const stateLabels: Record<FeatureState, string> = {
  open: "Open",
  queued: "Queued",
  working: "Copilot working",
  "pr-open": "PR open",
  done: "Done",
};

const checkLabels: Record<CheckStatus, string> = {
  passing: "✓ Checks passing",
  failing: "✕ Checks failing",
  pending: "● Checks running",
  none: "No checks",
};

export default function FeatureTable({ features }: { features: Section<FeatureItem[]> }) {
  return (
    <section className="detail-card" aria-labelledby="features-title">
      <div className="section-heading">
        <h2 id="features-title">Features</h2>
        {features.ok && <span className="section-count">{features.data.length} total</span>}
      </div>
      {!features.ok ? (
        <p className="section-error" role="status">
          {features.error}
        </p>
      ) : features.data.length === 0 ? (
        <p className="section-empty">No feature issues yet. Add one to the queue above.</p>
      ) : (
        <ul className="feature-list" data-testid="feature-list">
          {features.data.map((feature) => (
            <li className="feature-item" key={feature.number} data-testid="feature-item">
              <span className={`status-pill status-${feature.state}`}>
                {stateLabels[feature.state]}
              </span>
              <div className="feature-main">
                <a href={feature.url} target="_blank" rel="noreferrer">
                  #{feature.number} {feature.title}
                </a>
                {feature.pullRequest && (
                  <div className="feature-pr">
                    <a href={feature.pullRequest.url} target="_blank" rel="noreferrer">
                      PR #{feature.pullRequest.number}
                      {feature.pullRequest.isDraft ? " (draft)" : ""}
                    </a>
                    <span className={`check check-${feature.pullRequest.checks}`}>
                      {checkLabels[feature.pullRequest.checks]}
                    </span>
                    {feature.pullRequest.preview && (
                      <a href={feature.pullRequest.preview.url} target="_blank" rel="noreferrer">
                        Preview ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
