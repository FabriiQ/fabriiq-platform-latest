/**
 * Supabase Configuration
 * Centralized configuration for Supabase client and storage
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// Validate required environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Supabase URLs and keys
export const supabaseConfig = {
  url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// Storage configuration
export const storageConfig = {
  buckets: {
    socialWall: process.env.SUPABASE_STORAGE_BUCKET_SOCIAL_WALL || 'social-wall',
    avatars: process.env.SUPABASE_STORAGE_BUCKET_AVATARS || 'avatars',
    documents: process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'documents',
    assessments: process.env.SUPABASE_STORAGE_BUCKET_ASSESSMENTS || 'assessments',
    assessmentSubmissions: process.env.SUPABASE_STORAGE_BUCKET_ASSESSMENT_SUBMISSIONS || 'assessment-submissions',
    personalResources: process.env.SUPABASE_STORAGE_BUCKET_PERSONAL_RESOURCES || 'personal-resources',
    miscContent: process.env.SUPABASE_STORAGE_BUCKET_MISC_CONTENT || 'misc-content',
    classActivities: process.env.SUPABASE_STORAGE_BUCKET_CLASS_ACTIVITIES || 'class-activities',
  },
  maxFileSize: parseInt(process.env.SUPABASE_STORAGE_MAX_FILE_SIZE || '10485760'), // 10MB default
  cdnUrl: process.env.SUPABASE_STORAGE_CDN_URL || `${supabaseConfig.url}/storage/v1/object/public`,
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    videos: ['video/mp4', 'video/webm', 'video/quicktime'],
    documents: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
  },
  bucketConfigs: {
    socialWall: {
      public: true,
      allowedMimeTypes: [
        'image/*',
        'video/*',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: '10MB',
    },
    avatars: {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: '5MB',
    },
    documents: {
      public: false,
      allowedMimeTypes: ['application/*', 'text/*'],
      fileSizeLimit: '50MB',
    },
    assessments: {
      public: false,
      allowedMimeTypes: ['application/*', 'text/*', 'image/*'],
      fileSizeLimit: '25MB',
    },
    'assessment-submissions': {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        'video/mp4', 'video/webm',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: '50MB',
    },
    'personal-resources': {
      public: false, // GDPR/PDPL/FERPA: Personal resources must be private
      allowedMimeTypes: null, // Allow all file types for flexibility
      fileSizeLimit: '50MB',
      dataRetention: '7years', // FERPA compliance: Educational records retention
      encryption: 'AES-256', // Data protection requirement
      accessControl: 'user-only', // Only resource owner can access
      auditLogging: true, // GDPR Article 30: Records of processing activities
    },
    'misc-content': {
      public: true,
      allowedMimeTypes: null, // Allow all file types
      fileSizeLimit: '50MB',
    },
    'class-activities': {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        'video/mp4', 'video/webm',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      fileSizeLimit: '50MB',
    },
  },
} as const;

// Create Supabase clients with production optimizations
export const createSupabaseClient = () => {
  return createClient(supabaseConfig.url || '', supabaseConfig.anonKey || '', {
    // Disable real-time features to reduce overhead
    realtime: {
      params: {
        eventsPerSecond: 1, // Limit events
      },
    },
    // Disable auth features since we use NextAuth.js
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // Optimize for storage-only usage
    global: {
      headers: {
        'X-Client-Info': 'fabriiq-storage-only',
      },
    },
  });
};

export const createSupabaseServiceClient = () => {
  return createClient(supabaseConfig.url || '', supabaseConfig.serviceRoleKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // Disable real-time for service client
    realtime: {
      params: {
        eventsPerSecond: 0, // Disable completely
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'fabriiq-service-storage-only',
      },
    },
  });
};

// Utility functions
export const getPublicUrl = (bucket: string, path: string): string => {
  // Use the Supabase client to get the proper public URL
  const client = createClient(supabaseConfig.url || '', supabaseConfig.anonKey || '');
  const { data } = client.storage.from(bucket).getPublicUrl(path);

  // Fallback to CDN URL if getPublicUrl fails
  return data?.publicUrl || `${storageConfig.cdnUrl}/${bucket}/${path}`;
};

export const getBucketConfig = (bucketName: keyof typeof storageConfig.buckets) => {
  return storageConfig.bucketConfigs[bucketName];
};

export const getAllowedMimeTypes = (category: keyof typeof storageConfig.allowedMimeTypes) => {
  return storageConfig.allowedMimeTypes[category];
};

// File size utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const parseFileSize = (sizeStr: string): number => {
  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) throw new Error(`Invalid file size format: ${sizeStr}`);
  
  const [, size, unit] = match;
  return Math.floor(parseFloat(size) * units[unit.toUpperCase() as keyof typeof units]);
};

// MIME type validation
export const isValidMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const category = allowed.slice(0, -2);
      return mimeType.startsWith(category + '/');
    }
    return mimeType === allowed;
  });
};

// Generate unique file path
export const generateFilePath = (
  folder: string,
  originalFileName: string,
  options: { includeTimestamp?: boolean; includeRandom?: boolean } = {}
): string => {
  const { includeTimestamp = true, includeRandom = true } = options;
  
  const fileExtension = originalFileName.split('.').pop() || '';
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  
  let fileName = baseName;
  
  if (includeTimestamp) {
    fileName += `_${Date.now()}`;
  }
  
  if (includeRandom) {
    fileName += `_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  if (fileExtension) {
    fileName += `.${fileExtension}`;
  }
  
  return `${folder}/${fileName}`;
};
