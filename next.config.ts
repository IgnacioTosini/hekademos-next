import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The generated Prisma 7 client lives in src and is bundled by Next.
  serverExternalPackages: ['@prisma/client'],
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
