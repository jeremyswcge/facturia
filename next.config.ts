import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {},
  // Allow server-side googleapis
  serverExternalPackages: ['googleapis'],
}

export default nextConfig
