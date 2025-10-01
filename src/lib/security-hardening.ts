/**
 * Production Security Hardening for FabriiQ Platform
 * 
 * This module provides comprehensive security hardening including
 * rate limiting, CORS optimization, security headers, and threat protection.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Security configuration
 */
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMITS: {
    api: { requests: 100, window: 60000 }, // 100 requests per minute
    auth: { requests: 5, window: 60000 }, // 5 auth attempts per minute
    upload: { requests: 10, window: 60000 }, // 10 uploads per minute
    search: { requests: 50, window: 60000 }, // 50 searches per minute
  },
  
  // CORS settings
  CORS: {
    allowedOrigins: [
      'https://fabriiq.com',
      'https://app.fabriiq.com',
      'https://admin.fabriiq.com',
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Institution-ID',
      'X-API-Key',
    ],
    maxAge: 86400, // 24 hours
  },
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },
  
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'connect-src': ["'self'", 'https://api.fabriiq.com'],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  },
};

/**
 * Rate limiting store
 */
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Check and increment rate limit
   */
  checkLimit(key: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const current = this.store.get(key);
    
    if (!current || now > current.resetTime) {
      // New window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }
    
    current.count++;
    this.store.set(key, current);
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  /**
   * Get current stats
   */
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;
    
    for (const [, value] of this.store.entries()) {
      if (now <= value.resetTime) {
        activeKeys++;
      }
    }
    
    return {
      totalKeys: this.store.size,
      activeKeys,
    };
  }
  
  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Generate rate limit key
 */
function generateRateLimitKey(
  req: NextApiRequest | NextRequest,
  type: string = 'api'
): string {
  // Get IP address
  let ip = 'unknown';
  
  if ('headers' in req && req.headers) {
    ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         (req.headers['x-real-ip'] as string) ||
         'unknown';
  }
  
  // Get user ID if available
  let userId = 'anonymous';
  if ('user' in req && (req as any).user?.id) {
    userId = (req as any).user.id;
  }
  
  return `${type}:${ip}:${userId}`;
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  type: keyof typeof SECURITY_CONFIG.RATE_LIMITS = 'api'
) {
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
      const config = SECURITY_CONFIG.RATE_LIMITS[type];
      const key = generateRateLimitKey(req, type);
      
      const result = rateLimitStore.checkLimit(key, config.requests, config.window);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.requests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
      
      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || 60);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * CORS middleware
 */
export function withCORS(
  options: Partial<typeof SECURITY_CONFIG.CORS> = {}
) {
  const config = { ...SECURITY_CONFIG.CORS, ...options };
  
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
      const origin = req.headers.origin;
      
      // Check if origin is allowed
      if (origin && config.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (process.env.NODE_ENV === 'development') {
        // Allow all origins in development
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(
  additionalHeaders: Record<string, string> = {}
) {
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
      // Set security headers
      Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Set Content Security Policy
      const cspValue = Object.entries(SECURITY_CONFIG.CSP)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');
      res.setHeader('Content-Security-Policy', cspValue);
      
      // Set additional headers
      Object.entries(additionalHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      return handler(req, res);
    };
  };
}

/**
 * Input validation and sanitization
 */
export class InputSanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .substring(0, 1000); // Limit length
  }
  
  /**
   * Sanitize HTML input
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Basic HTML sanitization (in production, use a proper library like DOMPurify)
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Sanitize HTML input for educational content (allows safe iframes)
   */
  static sanitizeEducationalHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Allow iframes from trusted educational domains
    const trustedDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'player.vimeo.com',
      'docs.google.com',
      'drive.google.com',
      'forms.gle',
      'padlet.com',
      'flipgrid.com',
      'kahoot.it',
      'mentimeter.com',
      'polleverywhere.com'
    ];

    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Filter iframes to only allow trusted domains
    sanitized = sanitized.replace(/<iframe\b[^>]*>/gi, (match) => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        const isTrusted = trustedDomains.some(domain =>
          src.includes(domain) || src.startsWith('https://' + domain) || src.startsWith('https://www.' + domain)
        );

        if (isTrusted) {
          // Clean the iframe attributes but keep it
          return match
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
            .replace(/javascript:/gi, ''); // Remove javascript: URLs
        }
      }
      return ''; // Remove untrusted iframes
    });

    return sanitized;
  }
  
  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(input: string): string | null {
    if (typeof input !== 'string') {
      return null;
    }
    
    const email = input.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(email) ? email : null;
  }
  
  /**
   * Sanitize SQL-like input
   */
  static sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove potential SQL injection patterns
    return input
      .replace(/['";\\]/g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '')
      .trim();
  }
}

/**
 * Request validation middleware
 */
export function withRequestValidation(
  validationRules: {
    maxBodySize?: number;
    allowedContentTypes?: string[];
    requiredHeaders?: string[];
  } = {}
) {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB
    allowedContentTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
    requiredHeaders = [],
  } = validationRules;
  
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
      // Check content type
      const contentType = req.headers['content-type'];
      if (req.method !== 'GET' && contentType) {
        const isAllowed = allowedContentTypes.some(type => 
          contentType.includes(type)
        );
        
        if (!isAllowed) {
          return res.status(415).json({
            error: 'Unsupported Media Type',
            message: 'Content type not allowed',
          });
        }
      }
      
      // Check required headers
      for (const header of requiredHeaders) {
        if (!req.headers[header.toLowerCase()]) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Missing required header: ${header}`,
          });
        }
      }
      
      // Check body size (simplified check)
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength) > maxBodySize) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: 'Request body too large',
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Comprehensive security middleware
 */
export function withSecurity(
  options: {
    rateLimit?: keyof typeof SECURITY_CONFIG.RATE_LIMITS;
    cors?: boolean;
    securityHeaders?: boolean;
    requestValidation?: boolean;
  } = {}
) {
  const {
    rateLimit = 'api',
    cors = true,
    securityHeaders = true,
    requestValidation = true,
  } = options;
  
  return function (
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
  ) {
    let wrappedHandler = handler;
    
    // Apply middleware in reverse order (last applied runs first)
    if (requestValidation) {
      wrappedHandler = withRequestValidation()(wrappedHandler);
    }
    
    if (securityHeaders) {
      wrappedHandler = withSecurityHeaders()(wrappedHandler);
    }
    
    if (cors) {
      wrappedHandler = withCORS()(wrappedHandler);
    }
    
    if (rateLimit) {
      wrappedHandler = withRateLimit(rateLimit)(wrappedHandler);
    }
    
    return wrappedHandler;
  };
}

/**
 * Security monitoring
 */
export class SecurityMonitor {
  private static threats = new Map<string, { count: number; lastSeen: number }>();
  
  /**
   * Log security threat
   */
  static logThreat(
    type: string,
    details: {
      ip?: string;
      userAgent?: string;
      url?: string;
      payload?: any;
    }
  ): void {
    const key = `${type}:${details.ip || 'unknown'}`;
    const current = this.threats.get(key) || { count: 0, lastSeen: 0 };
    
    current.count++;
    current.lastSeen = Date.now();
    this.threats.set(key, current);
    
    console.warn(`🚨 Security threat detected: ${type}`, details);
    
    // Alert on repeated threats
    if (current.count >= 5) {
      console.error(`🚨 REPEATED SECURITY THREAT: ${type} from ${details.ip} (${current.count} times)`);
    }
  }
  
  /**
   * Get threat statistics
   */
  static getThreatStats(): Array<{
    type: string;
    ip: string;
    count: number;
    lastSeen: Date;
  }> {
    return Array.from(this.threats.entries()).map(([key, data]) => {
      const [type, ip] = key.split(':');
      return {
        type,
        ip,
        count: data.count,
        lastSeen: new Date(data.lastSeen),
      };
    });
  }
}

// Export rate limit store for monitoring
export { rateLimitStore };
