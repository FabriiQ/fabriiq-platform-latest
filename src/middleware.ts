import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

// Enhanced caching for production performance with memory management
const institutionCache = new Map<string, { valid: boolean; timestamp: number }>();
const routeCache = new Map<string, { response: NextResponse; timestamp: number }>();
const userTypeCache = new Map<string, { userType: string; timestamp: number }>();

// Optimized cache TTL values
const INSTITUTION_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for production
// Disable response/user-type caching to prevent cross-user leakage across sessions
const ROUTE_CACHE_TTL = 0; // Disabled – do not reuse NextResponse across requests
const USER_TYPE_CACHE_TTL = 0; // Disabled – validate per-request to avoid role bleed-through
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks

// Precompiled regex patterns for better performance
const SKIP_PATTERNS = /^\/(api|_next|static|favicon\.ico|h5p|login|unauthorized|robots\.txt|sitemap\.xml)/;
const PUBLIC_PATTERNS = /^\/(login|api\/auth|unauthorized|h5p-test|error)/;
const TEACHER_PATTERNS = /^\/(teacher|worksheets|app\/\(teacher\))/;
const STUDENT_PATTERNS = /^\/student|app\/\(student\)/;
const ADMIN_PATTERNS = /^\/admin/;

// Static asset patterns for aggressive caching
const STATIC_ASSET_PATTERNS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/;

/**
 * Cleanup expired cache entries to prevent memory leaks
 */
function cleanupCache<T>(cache: Map<string, T & { timestamp: number }>, ttl: number) {
  if (cache.size <= MAX_CACHE_SIZE) return;

  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > ttl) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Optimized institution validation with enhanced caching
 */
function isValidInstitution(institutionId: string): boolean {
  const cached = institutionCache.get(institutionId);
  if (cached && Date.now() - cached.timestamp < INSTITUTION_CACHE_TTL) {
    return cached.valid;
  }

  // Optimized validation with precompiled regex
  const isValid = /^[a-zA-Z0-9-_]{1,50}$/.test(institutionId);

  // Cleanup old cache entries periodically
  cleanupCache(institutionCache, INSTITUTION_CACHE_TTL);

  institutionCache.set(institutionId, { valid: isValid, timestamp: Date.now() });
  return isValid;
}

/**
 * Fast static asset detection
 */
function isStaticAsset(pathname: string): boolean {
  return STATIC_ASSET_PATTERNS.test(pathname) || pathname.includes('/_next/');
}

/**
 * Enhanced route classification for better performance
 */
function classifyRoute(pathname: string): 'skip' | 'public' | 'teacher' | 'student' | 'admin' | 'protected' {
  if (SKIP_PATTERNS.test(pathname) || isStaticAsset(pathname)) {
    return 'skip';
  }
  if (PUBLIC_PATTERNS.test(pathname)) {
    return 'public';
  }
  if (TEACHER_PATTERNS.test(pathname)) {
    return 'teacher';
  }
  if (STUDENT_PATTERNS.test(pathname)) {
    return 'student';
  }
  if (ADMIN_PATTERNS.test(pathname)) {
    return 'admin';
  }
  return 'protected';
}

/**
 * Optimized institution middleware with enhanced caching and performance
 */
function institutionMiddleware(req: NextRequest, routeType: string) {
  const pathname = req.nextUrl.pathname;

  // Skip institution validation for certain route types
  // IMPORTANT: Do not enforce institution context on admin routes
  if (routeType === 'skip' || routeType === 'public' || routeType === 'admin') {
    return null;
  }

  // Check route cache for repeated requests (with route type in key)
  const routeCacheKey = `route:${routeType}:${pathname}`;
  const cachedRoute = routeCache.get(routeCacheKey);
  if (cachedRoute && Date.now() - cachedRoute.timestamp < ROUTE_CACHE_TTL) {
    return cachedRoute.response;
  }

  // Extract the institution ID from the URL path (optimized)
  const firstSlashIndex = pathname.indexOf('/', 1);
  const potentialInstitutionId = firstSlashIndex === -1
    ? pathname.slice(1)
    : pathname.slice(1, firstSlashIndex);

  // If no institution ID or it's a root path, redirect to default institution
  if (!potentialInstitutionId || pathname === '/') {
    const defaultInstitution = process.env.DEFAULT_INSTITUTION || 'default';
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultInstitution}${pathname === '/' ? '' : pathname}`;
    const redirectResponse = NextResponse.redirect(url);

    // Cache redirect decisions
    routeCache.set(routeCacheKey, { response: redirectResponse, timestamp: Date.now() });
    return redirectResponse;
  }

  // Validate institution ID using cache
  if (!isValidInstitution(potentialInstitutionId)) {
    const unauthorizedResponse = NextResponse.redirect(new URL('/unauthorized', req.url));
    routeCache.set(routeCacheKey, { response: unauthorizedResponse, timestamp: Date.now() });
    return unauthorizedResponse;
  }

  // Add the institution ID to the request headers for use in API routes
  const response = NextResponse.next();
  response.headers.set('x-institution-id', potentialInstitutionId);
  response.headers.set('x-route-type', routeType);

  // Cache successful route decisions with cleanup
  cleanupCache(routeCache, ROUTE_CACHE_TTL);
  routeCache.set(routeCacheKey, { response, timestamp: Date.now() });

  return response;
}

/**
 * Optimized user type validation with caching
 */
function validateUserAccess(req: NextRequest, userType: string, routeType: string, pathname: string): NextResponse | null {
  const cacheKey = `access:${userType}:${routeType}:${pathname}`;
  const cached = userTypeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < USER_TYPE_CACHE_TTL) {
    return null; // Cached as valid access
  }

  let redirectUrl: string | null = null;

  // Optimized role-based routing logic
  switch (userType) {
    case 'CAMPUS_TEACHER':
    case 'TEACHER':
      // Teachers should never access admin routes
      if (routeType === 'admin') {
        redirectUrl = '/teacher/dashboard';
      } else if (routeType !== 'teacher' && routeType !== 'protected') {
        redirectUrl = '/teacher/dashboard';
      }
      break;

    case 'CAMPUS_STUDENT':
    case 'STUDENT':
      // Students should never access admin routes
      if (routeType === 'admin') {
        redirectUrl = '/student/classes';
      } else if (routeType !== 'student' && routeType !== 'protected') {
        redirectUrl = '/student/classes';
      }
      break;

    case 'SYSTEM_ADMIN':
    case 'CAMPUS_ADMIN':
    case 'CAMPUS_COORDINATOR':
    case 'COORDINATOR':
    case 'CAMPUS_PRINCIPAL':
      // Admin roles can access admin routes and protected routes
      break;

    default:
      // Unknown user types: restrict access to admin/teacher/student routes
      if (routeType === 'admin') {
        redirectUrl = '/unauthorized';
      } else if (routeType === 'teacher') {
        redirectUrl = '/unauthorized';
      } else if (routeType === 'student') {
        redirectUrl = '/unauthorized';
      }
      break;
  }

  // Cache the validation result
  cleanupCache(userTypeCache, USER_TYPE_CACHE_TTL);
  userTypeCache.set(cacheKey, { userType, timestamp: Date.now() });

  return redirectUrl ? NextResponse.redirect(new URL(redirectUrl, req.url)) : null;
}

// Production-optimized combined middleware with enhanced performance
export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Fast route classification
    const routeType = classifyRoute(pathname);

    // Skip middleware for static assets and API routes
    if (routeType === 'skip') {
      return NextResponse.next();
    }

    // Handle institution middleware with route type context
    const institutionResponse = institutionMiddleware(req, routeType);
    if (institutionResponse) {
      return institutionResponse;
    }

    // Allow public paths
    if (routeType === 'public') {
      return NextResponse.next();
    }

    // Require authentication for protected routes
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Validate user access with caching
    const userType = token.userType as string;
    const accessValidation = validateUserAccess(req, userType, routeType, pathname);
    if (accessValidation) {
      return accessValidation;
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login',
      error: '/unauthorized'
    }
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - h5p (H5P static files)
     * - Static assets with file extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|h5p|robots.txt|sitemap.xml).*)',
  ]
};
