import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local public folder images (logo, favicon)
    unoptimized: false,
    remotePatterns: [],
  },
  // Ensure Prisma works correctly on serverless (Vercel)
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
