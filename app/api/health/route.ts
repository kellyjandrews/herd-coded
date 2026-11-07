// Used by CI smoke tests after every preview and production deploy.
// NEXT_PUBLIC_* values are inlined at build time (see next.config.ts), so `sha`
// is the commit CI built — production.yml checks it to confirm the new build is live.
export function GET() {
  return Response.json({
    status: "ok",
    env: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? "development",
    sha: process.env.NEXT_PUBLIC_GIT_SHA ?? "local",
  });
}
