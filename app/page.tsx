export default function Home() {
  const env = process.env.NEXT_PUBLIC_DEPLOY_ENV;
  const sha = process.env.NEXT_PUBLIC_GIT_SHA?.slice(0, 7);

  return (
    <main style={{ maxWidth: 640, margin: "15vh auto", padding: "0 16px" }}>
      <h1 data-testid="hero-title">Your POC starts here</h1>
      <p>
        Start with the outcome you want. Run <code>/outcome</code> in Copilot Chat to generate
        suggestions; approve one before the factory plans, builds, tests, and ships it.
      </p>
    </main>
  );
}
