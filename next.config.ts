import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tunnel host: must be hostname only (Next compares Origin host, not full URL).
  allowedDevOrigins: ["dev.jayalbo.dev"],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/studio/:path*",
          destination: "/",
        },
      ],
    };
  },
};

export default nextConfig;
