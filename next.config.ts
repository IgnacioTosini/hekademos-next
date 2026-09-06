import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The custom Prisma client loads its native engine dynamically. Include it
  // explicitly so Vercel copies it into each Node.js function bundle.
  outputFileTracingIncludes: {
    '/*': ['src/generated/prisma/*.node'],
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
