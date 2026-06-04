import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kids-progress-tracker",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
