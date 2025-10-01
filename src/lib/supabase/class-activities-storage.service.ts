/**
 * Class Activities Storage Service
 * Specialized service for handling file uploads related to class activities
 */

import { TRPCError } from '@trpc/server';
import { logger } from '@/server/api/utils/logger';
import { SupabaseStorageService } from './storage.service';
import { storageConfig } from './config';

export interface ClassActivityUploadResult {
  id: string;
  url: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ClassActivityUploadOptions {
  activityId: string;
  userId: string;
  fileName: string;
  folder?: string;
  metadata?: Record<string, any>;
}

export class ClassActivitiesStorageService extends SupabaseStorageService {
  private readonly BUCKET_NAME = storageConfig.buckets.classActivities;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  private readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    // Video
    'video/mp4', 'video/webm'
  ];

  /**
   * Upload a file for class activities (teacher resources, student submissions, etc.)
   */
  async uploadClassActivityFile(
    file: File | Buffer,
    options: ClassActivityUploadOptions
  ): Promise<ClassActivityUploadResult> {
    try {
      // Validate file
      await this.validateClassActivityFile(file, options.fileName);

      // Generate secure file path
      const folder = options.folder || `activities/${options.activityId}`;
      const sanitizedFileName = this.sanitizeFileName(options.fileName);
      
      // Upload file using parent service
      const uploadResult = await this.uploadFile(file, sanitizedFileName, {
        bucket: this.BUCKET_NAME,
        folder: `${folder}/${options.userId}`,
        maxSize: this.MAX_FILE_SIZE,
        allowedTypes: this.ALLOWED_MIME_TYPES,
        metadata: {
          activityId: options.activityId,
          userId: options.userId,
          originalFileName: options.fileName,
          uploadedAt: new Date().toISOString(),
          ...options.metadata
        }
      });

      // Create signed URL for private bucket (24 hours expiry)
      const signedUrl = await this.createSignedUrl(uploadResult.path, 86400, this.BUCKET_NAME);

      // Return structured result
      return {
        id: this.generateFileId(),
        url: signedUrl,
        path: uploadResult.path,
        name: options.fileName,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        uploadedAt: new Date(),
      };

    } catch (error) {
      logger.error('Class activity file upload failed', {
        error,
        fileName: options.fileName,
        activityId: options.activityId,
        userId: options.userId
      });
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload class activity file',
      });
    }
  }

  /**
   * Upload student submission file
   */
  async uploadStudentSubmission(
    file: File | Buffer,
    fileName: string,
    activityId: string,
    studentId: string
  ): Promise<ClassActivityUploadResult> {
    return this.uploadClassActivityFile(file, {
      activityId,
      userId: studentId,
      fileName,
      folder: 'submissions',
      metadata: {
        type: 'student_submission',
        submittedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Upload teacher resource file
   */
  async uploadTeacherResource(
    file: File | Buffer,
    fileName: string,
    activityId: string,
    teacherId: string
  ): Promise<ClassActivityUploadResult> {
    return this.uploadClassActivityFile(file, {
      activityId,
      userId: teacherId,
      fileName,
      folder: 'resources',
      metadata: {
        type: 'teacher_resource',
        uploadedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Get signed URL for existing file
   */
  async getClassActivityFileUrl(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      return await this.createSignedUrl(filePath, expiresIn, this.BUCKET_NAME);
    } catch (error) {
      logger.error('Failed to get class activity file URL', {
        error,
        filePath
      });
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get file URL',
      });
    }
  }

  /**
   * Delete class activity file
   */
  async deleteClassActivityFile(filePath: string): Promise<void> {
    try {
      await this.deleteFile(filePath, this.BUCKET_NAME);
      
      logger.info('Class activity file deleted', {
        filePath,
        bucket: this.BUCKET_NAME
      });
    } catch (error) {
      logger.error('Failed to delete class activity file', {
        error,
        filePath
      });
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete file',
      });
    }
  }

  /**
   * List files for an activity
   */
  async listActivityFiles(
    activityId: string,
    folder?: string
  ): Promise<Array<{ name: string; path: string; size: number; lastModified: Date }>> {
    try {
      const folderPath = folder ? `${folder}/${activityId}` : `activities/${activityId}`;
      return await this.listFiles(folderPath, this.BUCKET_NAME);
    } catch (error) {
      logger.error('Failed to list activity files', {
        error,
        activityId,
        folder
      });
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list files',
      });
    }
  }

  /**
   * Validate class activity file
   */
  private async validateClassActivityFile(file: File | Buffer, fileName: string): Promise<void> {
    const fileSize = file instanceof File ? file.size : file.length;
    const mimeType = file instanceof File ? file.type : this.detectMimeType(fileName);

    // Check file size
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `File size exceeds limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    // Check file type
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `File type ${mimeType} is not allowed for class activities`,
      });
    }

    // Check file name
    if (!fileName || fileName.trim().length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File name is required',
      });
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Ensure file has an extension
    if (!sanitized.includes('.')) {
      return `${sanitized}.txt`;
    }
    
    return sanitized;
  }

  /**
   * Detect MIME type from file extension
   */
  private detectMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'webm': 'video/webm'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}
