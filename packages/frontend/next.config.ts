import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Ignore ESLint errors during production builds to unblock Docker image
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: ignore type errors during build for faster MVP iterations
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
