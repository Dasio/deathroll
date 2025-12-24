import type { NextConfig } from "next";

// Use base path for GitHub Pages (username.github.io/repo-name/)
// Set to "" if deploying to custom domain or username.github.io
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
