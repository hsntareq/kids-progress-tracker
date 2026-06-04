import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/kids-progress-tracker" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
