import type { NextConfig } from "next";

// No base path needed for custom domain
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
