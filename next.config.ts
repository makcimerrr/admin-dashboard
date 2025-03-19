import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
    appDir: true,
    mdxRs: true,
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