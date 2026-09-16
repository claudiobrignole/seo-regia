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
  // Il pannello non usa next/image: nessuna immagine passa dall ottimizzatore.
  // Spegnendolo sparisce anche la rotta /_next/image, che e la porta delle falle
  // gravi di settembre 2026 (AVIF, libheif). Quello che non c e non si buca.
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
}
export default nextConfig
