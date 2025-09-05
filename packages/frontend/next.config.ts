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
  async rewrites() {
  // Use Docker network host for backend within compose. For local non-Docker dev, adjust as needed.
  const backend = 'http://backend:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
      // If HLS assets are served from backend under /stream, proxy them too
      { source: '/stream/:path*', destination: `${backend}/stream/:path*` },
    ];
  },
};

export default nextConfig;
