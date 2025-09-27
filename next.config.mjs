/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Enable Next.js Image Optimization for remote images
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'ssl.gstatic.com' },
      { protocol: 'https', hostname: 'images.ctfassets.net' },
      { protocol: 'https', hostname: 'files.catbox.moe' },
    ],
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        // Cache static JSON configs with SWR
        source: '/:file(popup|presets|overlays).json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400' },
        ],
      },
      {
        // Cache game assets long-term (immutable)
        source: '/gf/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache static assets from /public (images, svg, ico)
        source: '/:all*(svg|png|jpg|jpeg|webp|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig