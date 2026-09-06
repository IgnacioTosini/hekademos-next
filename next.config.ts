import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve Node.js module paths instead of bundling a custom TS client.
  serverExternalPackages: ['@prisma/client'],
  outputFileTracingIncludes: {
    '/*': ['node_modules/.prisma/client/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com'
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com'
      }
    ],
    qualities: [75, 80, 85, 90],
  }
};

export default nextConfig;
