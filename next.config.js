/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    // 로컬 업로드 파일 허용
    remotePatterns: [],
    localPatterns: [
      { pathname: '/uploads/**' },
    ],
  },
  async headers() {
    return [
      {
        // 업로드된 파일에 대한 캐시 헤더
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
