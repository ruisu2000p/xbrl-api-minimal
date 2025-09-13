/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // SWCミニファイを一時的に無効化

  // ビルドIDを強制的に変更してキャッシュを無効化
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  },
  
  // パフォーマンス最適化
  experimental: {
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // キャッシュヘッダー設定
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig