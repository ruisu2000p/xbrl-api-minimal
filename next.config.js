/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // SWCミニファイを有効化（次期バージョンでは必須）

  // ビルドIDを強制的に変更してキャッシュを無効化
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },

  // 画像最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'readdy.ai',
        port: '',
        pathname: '/api/search-image**',
      },
    ],
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
    optimizeCss: false, // CSS最適化を無効化してcrittersエラーを回避
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