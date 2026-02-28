/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Suppress Suspense boundary warning for pages using useSearchParams
  experimental: {
    // Next 15 defaults: partial pre-rendering is now stable
  },
}

export default nextConfig