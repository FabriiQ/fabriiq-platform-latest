/**
 * Row Level Security (RLS) Context Middleware
 * 
 * This middleware sets the necessary context variables for RLS policies
 * to work correctly with the current user's session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/db';

export interface RLSContext {
  userId: string;
  institutionId: string;
  userType: string;
  campusId?: string;
}

/**
 * Set RLS context variables in the database session
 */
export async function setRLSContext(context: RLSContext) {
  try {
    // Set context variables that RLS policies can access
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_id', ${context.userId}, true);
    `;
    
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_institution_id', ${context.institutionId}, true);
    `;
    
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_type', ${context.userType}, true);
    `;
    
    if (context.campusId) {
      await prisma.$executeRaw`
        SELECT set_config('app.current_user_campus_id', ${context.campusId}, true);
      `;
    }
    
  } catch (error) {
    console.error('Error setting RLS context:', error);
    throw error;
  }
}

/**
 * Clear RLS context variables
 */
export async function clearRLSContext() {
  try {
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_id', '', true);
    `;
    
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_institution_id', '', true);
    `;
    
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_type', '', true);
    `;
    
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_campus_id', '', true);
    `;
    
  } catch (error) {
    console.error('Error clearing RLS context:', error);
  }
}

/**
 * Get RLS context from user session
 */
export async function getRLSContextFromSession(request: NextRequest): Promise<RLSContext | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }
    
    // Get user details for RLS context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        institutionId: true,
        userType: true,
        primaryCampusId: true,
      }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      userId: user.id,
      institutionId: user.institutionId,
      userType: user.userType,
      campusId: user.primaryCampusId || undefined,
    };
    
  } catch (error) {
    console.error('Error getting RLS context from session:', error);
    return null;
  }
}

/**
 * Middleware to automatically set RLS context for API routes
 */
export async function withRLSContext<T>(
  handler: (request: NextRequest, context: RLSContext) => Promise<T>
) {
  return async (request: NextRequest): Promise<T | NextResponse> => {
    try {
      const rlsContext = await getRLSContextFromSession(request);
      
      if (!rlsContext) {
        return NextResponse.json(
          { error: 'Unauthorized - No valid session' },
          { status: 401 }
        );
      }
      
      // Set RLS context
      await setRLSContext(rlsContext);
      
      try {
        // Execute the handler with RLS context
        const result = await handler(request, rlsContext);
        return result;
      } finally {
        // Always clear context after request
        await clearRLSContext();
      }
      
    } catch (error) {
      console.error('RLS context middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Hook for tRPC procedures to set RLS context
 */
export async function setRLSContextForTRPC(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        institutionId: true,
        userType: true,
        primaryCampusId: true,
      }
    });
    
    if (!user) {
      throw new Error('User not found for RLS context');
    }
    
    const context: RLSContext = {
      userId: user.id,
      institutionId: user.institutionId,
      userType: user.userType,
      campusId: user.primaryCampusId || undefined,
    };
    
    await setRLSContext(context);
    return context;
    
  } catch (error) {
    console.error('Error setting RLS context for tRPC:', error);
    throw error;
  }
}

/**
 * Utility to execute database operations with RLS context
 */
export async function withRLSContextExecution<T>(
  userId: string,
  operation: (context: RLSContext) => Promise<T>
): Promise<T> {
  let rlsContext: RLSContext | null = null;
  
  try {
    rlsContext = await setRLSContextForTRPC(userId);
    const result = await operation(rlsContext);
    return result;
  } finally {
    if (rlsContext) {
      await clearRLSContext();
    }
  }
}

/**
 * Enhanced Prisma client that automatically sets RLS context
 */
export class RLSPrismaClient {
  private userId: string;
  private context: RLSContext | null = null;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async initialize() {
    this.context = await setRLSContextForTRPC(this.userId);
    return this;
  }
  
  async cleanup() {
    if (this.context) {
      await clearRLSContext();
      this.context = null;
    }
  }
  
  get client() {
    if (!this.context) {
      throw new Error('RLS Prisma client not initialized. Call initialize() first.');
    }
    return prisma;
  }
}

/**
 * Factory function to create RLS-aware Prisma client
 */
export async function createRLSPrismaClient(userId: string): Promise<RLSPrismaClient> {
  const client = new RLSPrismaClient(userId);
  await client.initialize();
  return client;
}

/**
 * Validation helper to check if RLS is properly configured
 */
export async function validateRLSConfiguration(): Promise<{
  isConfigured: boolean;
  enabledTables: string[];
  disabledTables: string[];
  totalPolicies: number;
}> {
  try {
    // Check which tables have RLS enabled
    const tables = await prisma.$queryRaw<Array<{
      tablename: string;
      rowsecurity: boolean;
    }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    // Check total number of policies
    const policies = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_policies 
      WHERE schemaname = 'public';
    `;
    
    const enabledTables = tables.filter(t => t.rowsecurity).map(t => t.tablename);
    const disabledTables = tables.filter(t => !t.rowsecurity).map(t => t.tablename);
    const totalPolicies = Number(policies[0]?.count || 0);
    
    // Consider RLS properly configured if majority of tables have it enabled
    const isConfigured = enabledTables.length > disabledTables.length && totalPolicies > 10;
    
    return {
      isConfigured,
      enabledTables,
      disabledTables,
      totalPolicies,
    };
    
  } catch (error) {
    console.error('Error validating RLS configuration:', error);
    return {
      isConfigured: false,
      enabledTables: [],
      disabledTables: [],
      totalPolicies: 0,
    };
  }
}

/**
 * Development helper to bypass RLS for testing (USE WITH CAUTION)
 */
export async function bypassRLSForTesting(enabled: boolean = false) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RLS bypass is not allowed in production');
  }
  
  if (enabled) {
    console.warn('⚠️  RLS BYPASS ENABLED - FOR TESTING ONLY');
    await prisma.$executeRaw`SET row_security = off;`;
  } else {
    console.log('✅ RLS BYPASS DISABLED');
    await prisma.$executeRaw`SET row_security = on;`;
  }
}
