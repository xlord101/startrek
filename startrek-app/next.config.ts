import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local public folder images (logo, favicon)
    unoptimized: false,
    remotePatterns: [],
  },
  // Ensure Prisma works correctly on serverless (Vercel)
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
