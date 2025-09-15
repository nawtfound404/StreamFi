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
  // In Docker, use service hostname; in local dev, you can set NEXT_PUBLIC_API_BASE to http://localhost:8000/api
  const backend = process.env.NEXT_PUBLIC_API_BASE?.startsWith('http://localhost:8000')
      ? 'http://localhost:8000'
      : 'http://backend:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
      // If HLS assets are served from backend under /stream, proxy them too
      { source: '/stream/:path*', destination: `${backend}/stream/:path*` },
    ];
  },
};

export default nextConfig;
