import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="detail-shell">
      <div className="page-content">
        <Link className="back-link" href="/">
          ← Projects
        </Link>
        <div className="empty-state" data-testid="project-not-found">
          <h3>Project not found</h3>
          <p>This repository doesn't exist or wasn't created by this factory.</p>
        </div>
      </div>
    </main>
  );
}
