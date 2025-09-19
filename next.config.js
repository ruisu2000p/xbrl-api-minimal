/** @type {import('next').NextConfig} */
const path = require('path')

// Bundle analyzer for performance monitoring
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Compress output for better performance
  compress: true,
  
  // Optimize build output
  poweredByHeader: false,
  
  // Generate build ID for cache busting when needed
  generateBuildId: async () => {
    if (process.env.NODE_ENV === 'production') {
      return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || `build-${Date.now()}`
    }
    return 'development'
  },

  // Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'readdy.ai',
        port: '',
        pathname: '/api/search-image**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }

    // Performance optimizations
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 20,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
          },
        },
      }
    }

    // Bundle size monitoring
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new webpack.DefinePlugin({
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        })
      )
    }

    return config
  },
  
  // Experimental features for performance
  experimental: {
    // Server components optimization
    serverComponentsExternalPackages: [
      '@supabase/supabase-js',
      'bcryptjs',
      'isomorphic-dompurify'
    ],
    
    // Optimize CSS loading
    optimizeCss: true,
    
    // Enable gzip compression
    gzipSize: true,
    
    // Turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // HTTP headers for performance and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ]
  },

  // Rewrites for better routing performance
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ]
  },

  // Redirects for SEO and performance
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/docs/getting-started',
        permanent: true,
      },
    ]
  },

  // Output configuration for deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Logging for development
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

module.exports = withBundleAnalyzer(nextConfig)