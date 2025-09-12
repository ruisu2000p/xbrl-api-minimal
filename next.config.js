/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // SWCフォールバックの無効化
  // Vercelビルドでのキャッシュ問題を回避
  experimental: {
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // SWCフォールバックを無効化してVercelのビルトインSWCを使用
    forceSwcTransforms: true,
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