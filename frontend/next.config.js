/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' - Firebase apps need SSR capabilities
  // Static export doesn't work well with Firebase Auth and Firestore
  images: {
    unoptimized: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Skip generating error pages during build
  // They'll be handled at runtime
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
