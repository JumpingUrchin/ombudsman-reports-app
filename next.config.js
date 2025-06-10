/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Commented out as per user request for dynamic SSR
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable middleware for static export
  // All routing and language detection will be handled client-side
  
  // GitHub Pages deployment configuration
  basePath: process.env.NODE_ENV === 'production' ? '/ombudsman-reports-app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ombudsman-reports-app/' : '',
}

module.exports = nextConfig