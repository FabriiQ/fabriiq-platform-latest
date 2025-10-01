// Load polyfills for server-side rendering
require('./src/polyfills/worker-polyfill.js');

// Bundle analyzer for optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
        buildActivity: false, // Disables the build activity indicator
      
      },
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
    dirs: ['src', 'app'],
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  
  // Memory optimization settings - simplified for stability
  experimental: {
    // Enable worker threads for faster compilation
    workerThreads: false, // Disabled to prevent chunk loading issues
    // Optimize package imports to reduce bundle size - reduced list
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
    ],
    // Disable experimental features that may cause chunk loading issues
    viewTransition: false,
    optimizeCss: false,
    scrollRestoration: false,
    optimizeServerReact: false,
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    // Enable SWC minification for better performance
    styledComponents: true,
  },

  webpack: (config, { isServer, dev }) => {
    // Enable filesystem caching for faster builds (disabled temporarily)
    // config.cache = {
    //   type: 'filesystem',
    //   buildDependencies: {
    //     config: [__filename],
    //   },
    //   cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
    //   maxMemoryGenerations: dev ? 5 : 1,
    // };

    // Optimize module resolution for faster compilation
    config.resolve.symlinks = false;
    config.resolve.cacheWithContext = false;

    // Simplified optimization for webpack to prevent chunk loading issues
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Simple vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }

    // Handle binary modules used by H5P
    if (isServer) {
      // Add all @node-rs/crc32 platform-specific binaries to externals
      config.externals.push({
        '@node-rs/crc32-win32-x64-msvc': 'commonjs @node-rs/crc32-win32-x64-msvc',
        '@node-rs/crc32-darwin-x64': 'commonjs @node-rs/crc32-darwin-x64',
        '@node-rs/crc32-linux-x64-gnu': 'commonjs @node-rs/crc32-linux-x64-gnu',
        '@node-rs/crc32-linux-x64-musl': 'commonjs @node-rs/crc32-linux-x64-musl',
        '@node-rs/crc32-android-arm64': 'commonjs @node-rs/crc32-android-arm64',
        '@node-rs/crc32-darwin-arm64': 'commonjs @node-rs/crc32-darwin-arm64',
        '@node-rs/crc32-linux-arm64-gnu': 'commonjs @node-rs/crc32-linux-arm64-gnu',
        '@node-rs/crc32-linux-arm64-musl': 'commonjs @node-rs/crc32-linux-arm64-musl',
        '@node-rs/crc32-win32-arm64-msvc': 'commonjs @node-rs/crc32-win32-arm64-msvc',
        'yauzl-promise': 'commonjs yauzl-promise'
      });

      // Exclude web workers from server-side bundle
      config.externals.push(/\.worker\.(js|ts)$/);
    }

    // Add fallbacks for Node.js globals
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  
  // Disable server-side rendering for H5P components
  reactStrictMode: true,
  transpilePackages: ['@lumieducation/h5p-react', '@lumieducation/h5p-webcomponents'],
  
  // External packages configuration
  serverExternalPackages: ['@prisma/client', '@prisma/engines'],
  
  // Optimize image formats for better performance
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [],
  },

  // Add caching headers for better performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/h5p/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
    ];
  },

  // URL rewrites for backward compatibility
  async rewrites() {
    return [
      {
        source: '/admin/campus/classes/:id/actvity',
        destination: '/admin/campus/classes/:id/activities',
      },
      {
        source: '/admin/campus/classes/:id/assignments',
        destination: '/admin/campus/classes/:id/assessments',
      },
      {
        source: '/admin/campus/classes/:id/assignments/create',
        destination: '/admin/campus/classes/:id/assessments/new',
      },
      {
        source: '/admin/campus/classes/:id/assignments/:assignmentId',
        destination: '/admin/campus/classes/:id/assessments/:assignmentId',
      },
      {
        source: '/admin/campus/classes/:id/assignments/:assignmentId/edit',
        destination: '/admin/campus/classes/:id/assessments/:assignmentId/edit',
      },
      // Worksheet routes removed - using direct routing instead
    ];
  },

  // Turbopack configuration - temporarily disabled to fix chunk loading issues
  // turbopack: {
  //   rules: {
  //     '*.svg': {
  //       loaders: ['@svgr/webpack'],
  //       as: '*.js',
  //     },
  //   },
  // },
};

module.exports = withBundleAnalyzer(nextConfig);
