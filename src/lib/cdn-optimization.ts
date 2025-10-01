/**
 * CDN Optimization Utilities for FabriiQ Platform
 * 
 * This module provides CDN optimization, asset management, and
 * static resource caching strategies.
 */

import { NextResponse } from 'next/server';

/**
 * CDN configuration
 */
const CDN_CONFIG = {
  // Asset types and their cache durations (in seconds)
  CACHE_DURATIONS: {
    // Static assets - long cache
    images: 31536000, // 1 year
    fonts: 31536000, // 1 year
    css: 31536000, // 1 year
    js: 31536000, // 1 year
    
    // Dynamic content - shorter cache
    html: 3600, // 1 hour
    api: 300, // 5 minutes
    json: 1800, // 30 minutes
    
    // H5P content - medium cache
    h5p: 86400, // 24 hours
  },
  
  // File extensions mapping
  EXTENSIONS: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif', '.ico'],
    fonts: ['.woff', '.woff2', '.ttf', '.eot', '.otf'],
    css: ['.css'],
    js: ['.js', '.mjs'],
    json: ['.json'],
    h5p: ['.h5p'],
  },
  
  // Compression settings
  COMPRESSION: {
    threshold: 1024, // Minimum size to compress (1KB)
    level: 6, // Compression level (1-9)
  },
};

/**
 * Get asset type from file extension
 */
function getAssetType(pathname: string): string | null {
  const extension = pathname.toLowerCase().substring(pathname.lastIndexOf('.'));
  
  for (const [type, extensions] of Object.entries(CDN_CONFIG.EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return type;
    }
  }
  
  return null;
}

/**
 * Generate cache headers for different asset types
 */
export function generateCacheHeaders(pathname: string, assetType?: string): Record<string, string> {
  const type = assetType || getAssetType(pathname) || 'html';
  const maxAge = CDN_CONFIG.CACHE_DURATIONS[type] || CDN_CONFIG.CACHE_DURATIONS.html;
  
  const headers: Record<string, string> = {};
  
  // Set cache control headers
  if (type === 'images' || type === 'fonts' || type === 'css' || type === 'js') {
    // Static assets - aggressive caching with immutable
    headers['Cache-Control'] = `public, max-age=${maxAge}, immutable`;
    headers['Expires'] = new Date(Date.now() + maxAge * 1000).toUTCString();
  } else if (type === 'api') {
    // API responses - short cache with revalidation
    headers['Cache-Control'] = `public, max-age=${maxAge}, stale-while-revalidate=300`;
  } else {
    // Dynamic content - moderate caching
    headers['Cache-Control'] = `public, max-age=${maxAge}, must-revalidate`;
  }
  
  // Add ETag for better caching
  headers['ETag'] = `"${Date.now()}"`;
  
  // Add Vary header for content negotiation
  headers['Vary'] = 'Accept-Encoding, Accept';
  
  return headers;
}

/**
 * Optimize response with compression and caching
 */
export function optimizeResponse(response: NextResponse, pathname: string): NextResponse {
  const assetType = getAssetType(pathname);
  
  // Add cache headers
  const cacheHeaders = generateCacheHeaders(pathname, assetType || undefined);
  Object.entries(cacheHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add security headers for static assets
  if (assetType === 'images' || assetType === 'fonts') {
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  // Add performance headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

/**
 * Asset optimization middleware
 */
export function withAssetOptimization(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Check if this is a static asset
    const assetType = getAssetType(pathname);
    
    if (assetType) {
      // Check if client has cached version
      const ifNoneMatch = request.headers.get('if-none-match');
      const ifModifiedSince = request.headers.get('if-modified-since');
      
      if (ifNoneMatch || ifModifiedSince) {
        // Return 304 Not Modified for cached assets
        return new NextResponse(null, {
          status: 304,
          headers: generateCacheHeaders(pathname, assetType),
        });
      }
    }
    
    // Execute the handler
    const response = await handler(request);
    
    // Optimize the response
    return optimizeResponse(response, pathname);
  };
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Generate responsive image URLs
   */
  static generateResponsiveUrls(baseUrl: string, sizes: number[] = [640, 750, 828, 1080, 1200, 1920]): string[] {
    return sizes.map(size => `${baseUrl}?w=${size}&q=75`);
  }
  
  /**
   * Generate WebP/AVIF variants
   */
  static generateModernFormats(baseUrl: string): { webp: string; avif: string } {
    return {
      webp: `${baseUrl}?format=webp&q=80`,
      avif: `${baseUrl}?format=avif&q=75`,
    };
  }
  
  /**
   * Generate picture element HTML
   */
  static generatePictureElement(
    baseUrl: string,
    alt: string,
    sizes: string = '100vw'
  ): string {
    const modernFormats = this.generateModernFormats(baseUrl);
    const responsiveUrls = this.generateResponsiveUrls(baseUrl);
    
    return `
      <picture>
        <source srcset="${modernFormats.avif}" type="image/avif" sizes="${sizes}">
        <source srcset="${modernFormats.webp}" type="image/webp" sizes="${sizes}">
        <img src="${baseUrl}" alt="${alt}" loading="lazy" decoding="async">
      </picture>
    `.trim();
  }
}

/**
 * Font optimization utilities
 */
export class FontOptimizer {
  /**
   * Generate font preload links
   */
  static generatePreloadLinks(fonts: Array<{ url: string; format: string }>): string[] {
    return fonts.map(font => 
      `<link rel="preload" href="${font.url}" as="font" type="font/${font.format}" crossorigin>`
    );
  }
  
  /**
   * Generate font display CSS
   */
  static generateFontDisplayCSS(fontFamily: string, fallback: string = 'sans-serif'): string {
    return `
      @font-face {
        font-family: '${fontFamily}';
        font-display: swap;
        font-fallback: ${fallback};
      }
    `.trim();
  }
}

/**
 * Static asset manifest for cache busting
 */
export class AssetManifest {
  private static manifest: Map<string, string> = new Map();
  
  /**
   * Add asset to manifest
   */
  static addAsset(path: string, hash: string): void {
    this.manifest.set(path, hash);
  }
  
  /**
   * Get asset URL with cache busting
   */
  static getAssetUrl(path: string): string {
    const hash = this.manifest.get(path);
    if (hash) {
      const url = new URL(path, 'http://localhost');
      url.searchParams.set('v', hash);
      return url.pathname + url.search;
    }
    return path;
  }
  
  /**
   * Generate manifest JSON
   */
  static generateManifest(): Record<string, string> {
    return Object.fromEntries(this.manifest.entries());
  }
}

/**
 * Performance monitoring for CDN
 */
export class CDNPerformanceMonitor {
  private static metrics: Map<string, { hits: number; misses: number; size: number }> = new Map();
  
  /**
   * Record cache hit
   */
  static recordHit(path: string, size: number = 0): void {
    const current = this.metrics.get(path) || { hits: 0, misses: 0, size: 0 };
    current.hits++;
    current.size = Math.max(current.size, size);
    this.metrics.set(path, current);
  }
  
  /**
   * Record cache miss
   */
  static recordMiss(path: string, size: number = 0): void {
    const current = this.metrics.get(path) || { hits: 0, misses: 0, size: 0 };
    current.misses++;
    current.size = Math.max(current.size, size);
    this.metrics.set(path, current);
  }
  
  /**
   * Get performance metrics
   */
  static getMetrics(): Record<string, { hitRate: number; totalRequests: number; size: number }> {
    const result: Record<string, { hitRate: number; totalRequests: number; size: number }> = {};
    
    for (const [path, metrics] of this.metrics.entries()) {
      const totalRequests = metrics.hits + metrics.misses;
      const hitRate = totalRequests > 0 ? (metrics.hits / totalRequests) * 100 : 0;
      
      result[path] = {
        hitRate: Math.round(hitRate * 100) / 100,
        totalRequests,
        size: metrics.size,
      };
    }
    
    return result;
  }
  
  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Service Worker cache strategies
 */
export class ServiceWorkerCache {
  /**
   * Generate service worker cache configuration
   */
  static generateCacheConfig(): {
    staticAssets: string[];
    dynamicRoutes: string[];
    cacheStrategies: Record<string, string>;
  } {
    return {
      staticAssets: [
        '/_next/static/',
        '/images/',
        '/fonts/',
        '/icons/',
      ],
      dynamicRoutes: [
        '/api/subjects',
        '/api/topics',
        '/api/institutions',
      ],
      cacheStrategies: {
        static: 'CacheFirst',
        api: 'StaleWhileRevalidate',
        pages: 'NetworkFirst',
      },
    };
  }
}

/**
 * Export CDN configuration for external use
 */
export { CDN_CONFIG };
