import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  transpilePackages: ['syllable', 'maplibre-gl'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};
export default nextConfig;
