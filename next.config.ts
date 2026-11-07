import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the commit + environment so previews show what they're running.
  env: {
    // `||` not `??`: `vercel pull` sets VERCEL_GIT_COMMIT_SHA to "" for CLI builds.
    NEXT_PUBLIC_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "development",
  },
};

export default nextConfig;
