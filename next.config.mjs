/** @type {import('next').NextConfig} */
const nextConfig = {
  // Il pannello non deve MAI finire nei motori di ricerca.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ]
  },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
}
export default nextConfig
