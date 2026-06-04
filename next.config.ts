import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build autonome (sortie minimale) pour l'image Docker déployée sur le VPS.
  output: 'standalone' as const,
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'avatars.githubusercontent.com'
      },
      {
        protocol: 'https' as const,
        hostname: '*.public.blob.vercel-storage.com'
      },
      {
        protocol: 'https' as const,
        hostname: 'lh3.googleusercontent.com'
      }
    ]
  },
  experimental: {
    mdxRs: true,
  },
  async headers() {
    return [
      {
        // Applique les en-têtes de sécurité à toutes les routes.
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // TODO: CSP (nonce) à ajouter prudemment
        ],
      },
    ];
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Si vous voulez utiliser remark et rehype plugins
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig)