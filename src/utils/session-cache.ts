import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/server/api/utils/logger";
import { Session } from "next-auth";

// Augmented session type that includes the userId property for backward compatibility
interface AugmentedSession extends Session {
  userId?: string;
}

// In-memory session cache to reduce database calls
const sessionCache = new Map<string, { session: AugmentedSession; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      sessionCache.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export async function getSessionCache(): Promise<AugmentedSession | null> {
  try {
    // Get session from NextAuth first to get the user ID for caching
    const session = await getServerSession(authOptions) as AugmentedSession | null;

    if (!session?.user?.id) {
      return null;
    }

    // Create a cache key based on the user ID to ensure session isolation
    const cacheKey = `session:${session.user.id}`;

    // Check cache first
    const cached = sessionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Verify the cached session matches the current session user
      if (cached.session.user.id === session.user.id) {
        return cached.session;
      } else {
        // Remove invalid cache entry
        sessionCache.delete(cacheKey);
      }
    }

    // Add backward compatibility
    if (!session.userId) {
      session.userId = session.user.id;
    }

    // Cache the session with user-specific key
    if (sessionCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = sessionCache.keys().next().value;
      sessionCache.delete(firstKey);
    }

    sessionCache.set(cacheKey, {
      session,
      timestamp: Date.now()
    });

    return session;
  } catch (error) {
    logger.error("Error getting session", { error: String(error) });
    return null;
  }
}

/**
 * Clear session cache - useful for logout or session updates
 * @param userId - Optional user ID to clear specific user's cache, if not provided clears all
 */
export function clearSessionCache(userId?: string): void {
  if (userId) {
    // Clear specific user's session cache
    const cacheKey = `session:${userId}`;
    sessionCache.delete(cacheKey);
  } else {
    // Clear all session cache
    sessionCache.clear();
  }
}

/**
 * Get session cache stats for monitoring
 */
export function getSessionCacheStats() {
  return {
    size: sessionCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}
