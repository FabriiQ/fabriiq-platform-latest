#!/usr/bin/env node

/**
 * Next.js Configuration Conflict Resolution
 * 
 * This script resolves conflicts between multiple Next.js configuration files
 * by consolidating them into a single, optimized configuration.
 */

const fs = require('fs');
const path = require('path');

console.log('⚙️  Next.js Configuration Conflict Resolution');
console.log('=============================================');

// Define the configuration files to check
const CONFIG_FILES = [
  'next.config.js',
  'next.config.mjs', 
  'next.config.ts'
];

/**
 * Analyze existing configuration files
 */
function analyzeConfigFiles() {
  console.log('\n🔍 Analyzing configuration files...\n');
  
  const existingConfigs = [];
  
  CONFIG_FILES.forEach(filename => {
    if (fs.existsSync(filename)) {
      const stats = fs.statSync(filename);
      const content = fs.readFileSync(filename, 'utf8');
      
      existingConfigs.push({
        filename,
        size: stats.size,
        lines: content.split('\n').length,
        content,
        lastModified: stats.mtime
      });
      
      console.log(`📄 Found: ${filename} (${stats.size} bytes, ${content.split('\n').length} lines)`);
    }
  });
  
  if (existingConfigs.length === 0) {
    console.log('❌ No Next.js configuration files found!');
    return null;
  }
  
  if (existingConfigs.length === 1) {
    console.log('✅ Only one configuration file found - no conflicts to resolve.');
    return existingConfigs;
  }
  
  console.log(`\n⚠️  Found ${existingConfigs.length} configuration files - this creates conflicts!`);
  console.log('Next.js will use the first one it finds, which may not be the intended configuration.\n');
  
  return existingConfigs;
}

/**
 * Create consolidated configuration
 */
function createConsolidatedConfig() {
  const consolidatedConfig = `// Load polyfills for server-side rendering
require('./src/polyfills/worker-polyfill.js');

// Bundle analyzer for optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
    dirs: ['src', 'app'],
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  
  // Memory optimization settings
  experimental: {
    // Enable worker threads for faster compilation
    workerThreads: true,
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'socket.io', 
      'socket.io-client', 
      'lucide-react', 
      '@radix-ui/react-dialog', 
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dropdown-menu',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'framer-motion',
      'react-beautiful-dnd'
    ],
    // Disable View Transitions API to prevent compilation issues
    viewTransition: process.env.DISABLE_VIEW_TRANSITIONS !== 'true',
    // Enable CSS optimization for better performance
    optimizeCss: true,
    // Maintain scroll position during navigation
    scrollRestoration: true,
    // Enable optimized server React for faster compilation
    optimizeServerReact: true,
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
    // Enable filesystem caching for faster builds
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: '.next/cache/webpack',
      maxMemoryGenerations: dev ? 5 : 1,
    };

    // Optimize module resolution for faster compilation
    config.resolve.symlinks = false;
    config.resolve.cacheWithContext = false;

    // Memory optimization for webpack
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\\\/]node_modules[\\\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 244000,
              priority: 10,
            },
            // Separate React-related libraries
            react: {
              test: /[\\\\/]node_modules[\\\\/](react|react-dom)[\\\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
            },
            // Separate UI libraries
            ui: {
              test: /[\\\\/]node_modules[\\\\/](@radix-ui|lucide-react|framer-motion)[\\\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
            // Separate editor libraries
            editor: {
              test: /[\\\\/]node_modules[\\\\/](@tiptap|react-beautiful-dnd)[\\\\/]/,
              name: 'editor',
              chunks: 'all',
              priority: 15,
            },
            // Common chunks for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
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
      config.externals.push(/\\.worker\\.(js|ts)$/);
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
      {
        source: '/worksheets',
        destination: '/app/(teacher)/worksheets',
      },
      {
        source: '/worksheets/create',
        destination: '/app/(teacher)/worksheets/create',
      },
      {
        source: '/worksheets/:id',
        destination: '/app/(teacher)/worksheets/:id',
      },
    ];
  },

  // Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

module.exports = withBundleAnalyzer(nextConfig);
`;

  return consolidatedConfig;
}

/**
 * Backup existing configuration files
 */
function backupExistingConfigs(existingConfigs) {
  console.log('\n💾 Backing up existing configuration files...\n');
  
  const backupDir = 'temp/nextjs-config-backup';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  existingConfigs.forEach(config => {
    const backupPath = path.join(backupDir, config.filename);
    fs.writeFileSync(backupPath, config.content);
    console.log(`📄 Backed up: ${config.filename} → ${backupPath}`);
  });
  
  // Create backup index
  const backupIndex = `# Next.js Configuration Backup

This directory contains backup copies of the original Next.js configuration files
that were consolidated to resolve conflicts.

## Original Files:

${existingConfigs.map(config => 
  `### ${config.filename}
- Size: ${config.size} bytes
- Lines: ${config.lines}
- Last Modified: ${config.lastModified.toISOString()}
- Backup: [${config.filename}](./${config.filename})
`).join('\n')}

## Restoration:

To restore any of these configurations:
1. Copy the desired file from this backup directory
2. Replace the current next.config.js in the root directory
3. Remove any other next.config.* files to avoid conflicts

---
*Backup created: ${new Date().toISOString()}*
`;
  
  fs.writeFileSync(path.join(backupDir, 'README.md'), backupIndex);
  console.log(`📚 Created backup index: ${backupDir}/README.md`);
}

/**
 * Remove conflicting configuration files
 */
function removeConflictingConfigs() {
  console.log('\n🗑️  Removing conflicting configuration files...\n');
  
  CONFIG_FILES.forEach(filename => {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
      console.log(`❌ Removed: ${filename}`);
    }
  });
}

/**
 * Create the new consolidated configuration
 */
function createNewConfig() {
  console.log('\n✨ Creating consolidated configuration...\n');
  
  const consolidatedConfig = createConsolidatedConfig();
  fs.writeFileSync('next.config.js', consolidatedConfig);
  
  console.log('✅ Created: next.config.js (consolidated configuration)');
  
  return consolidatedConfig.split('\n').length;
}

/**
 * Main resolution function
 */
function resolveConfigConflicts() {
  console.log('Starting Next.js configuration conflict resolution...\n');
  
  const existingConfigs = analyzeConfigFiles();
  
  if (!existingConfigs) {
    console.log('❌ No configuration files to process.');
    return;
  }
  
  if (existingConfigs.length === 1) {
    console.log('✅ No conflicts found - single configuration file is optimal.');
    return;
  }
  
  // Backup existing configurations
  backupExistingConfigs(existingConfigs);
  
  // Remove conflicting files
  removeConflictingConfigs();
  
  // Create new consolidated configuration
  const newConfigLines = createNewConfig();
  
  console.log('\n✅ CONFLICT RESOLUTION SUMMARY');
  console.log('==============================');
  console.log(`📊 Original files: ${existingConfigs.length}`);
  console.log(`📊 Consolidated into: 1 file`);
  console.log(`📊 New configuration: ${newConfigLines} lines`);
  console.log(`💾 Backups saved to: temp/nextjs-config-backup/`);
  
  console.log('\n🎯 Next.js configuration conflicts resolved!');
  console.log('\n📋 Next steps:');
  console.log('1. Test the application to ensure it builds and runs correctly');
  console.log('2. Review the consolidated configuration for any needed adjustments');
  console.log('3. Remove backup files once you confirm everything works');
  console.log('4. Update any documentation that references the old config files');
}

// Run resolution if this script is executed directly
if (require.main === module) {
  resolveConfigConflicts();
}

module.exports = { resolveConfigConflicts, analyzeConfigFiles };
