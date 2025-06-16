/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables (backup method)
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: '431073746499-02boqh099nag50pib62orjsk8jmcluol.apps.googleusercontent.com',
    NEXT_PUBLIC_API_URL: 'http://localhost:8000/api/v1',
  },
  // Minimal configuration for proper CSS loading
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Image optimization
  images: {
    domains: ['localhost', 'docplatform.s3.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  // Bundle analyzer
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle canvas dependency for react-pdf
    config.resolve.alias.canvas = false
    
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all'
    }
    
    return config
  },
  // Output for static export if needed
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
}

module.exports = nextConfig 