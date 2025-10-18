/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental features for production
  // serverActions is now stable in Next.js 14
  images: {
    domains: [], // Add any image domains you use
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Optimize compiler
  experimental: {
    optimizeCss: true,
  }
}

module.exports = nextConfig