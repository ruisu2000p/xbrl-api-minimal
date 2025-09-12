/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // React strict mode for better development
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: ['zxzyidqrvzfzhicfuhlo.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      // CORS for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, X-API-Key, Authorization'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/api',
        destination: '/api/v1',
        permanent: true,
      },
      {
        source: '/docs',
        destination: '/docs/api',
        permanent: false,
      }
    ];
  },
  
  // Environment variables validation
  env: {
    APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
    };
    
    // Ignore unnecessary files
    config.module.rules.push({
      test: /\.(md|txt)$/,
      use: 'raw-loader',
    });
    
    return config;
  },
};

export default nextConfig;