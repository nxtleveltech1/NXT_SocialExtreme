import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React Compiler in dev for faster startup
  reactCompiler: process.env.NODE_ENV === "production",
  images: {
    remotePatterns: [],
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
