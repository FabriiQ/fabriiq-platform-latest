/**
 * Assessment Submission Storage Service
 * Specialized service for handling assessment submission file uploads
 */

import { TRPCError } from '@trpc/server';
import { logger } from '@/server/api/utils/logger';
import { SupabaseStorageService } from './storage.service';
import { storageConfig, createSupabaseServiceClient } from './config';

export interface SubmissionUploadResult {
  id: string;
  url: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface SubmissionAttachment {
  id: string;
  name: string;
  url: string;
  path: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  submissionId: string;
}

export class SubmissionStorageService extends SupabaseStorageService {
  private readonly BUCKET_NAME = storageConfig.buckets.assessmentSubmissions;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly supabaseClient = createSupabaseServiceClient();
  
  private readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    // Video (limited)
    'video/mp4', 'video/webm'
  ];

  /**
   * Upload submission file with validation and metadata
   */
  async uploadSubmissionFile(
    file: File | Buffer,
    fileName: string,
    submissionId: string,
    studentId: string
  ): Promise<SubmissionUploadResult> {
    try {
      // Validate file
      await this.validateSubmissionFile(file, fileName);

      // Generate secure file path
      const folder = `submissions/${submissionId}`;
      const sanitizedFileName = this.sanitizeFileName(fileName);
      
      // Upload file using parent service
      const uploadResult = await this.uploadFile(file, sanitizedFileName, {
        bucket: this.BUCKET_NAME,
        folder,
        maxSize: this.MAX_FILE_SIZE,
        allowedTypes: this.ALLOWED_MIME_TYPES,
        metadata: {
          submissionId,
          studentId,
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
        }
      });

      // Create signed URL for private bucket (24 hours expiry)
      const signedUrl = await this.createSignedUrl(uploadResult.path, 86400, this.BUCKET_NAME);

      // Return structured result
      return {
        id: this.generateFileId(),
        url: signedUrl,
        path: uploadResult.path,
        name: fileName,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        uploadedAt: new Date(),
      };

    } catch (error) {
      logger.error('Submission file upload failed', {
        error,
        fileName,
        submissionId,
        studentId
      });
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload submission file',
      });
    }
  }

  /**
   * Get signed URL for existing submission file
   */
  async getSubmissionFileUrl(filePath: string, expiresIn: number = 86400): Promise<string> {
    try {
      return await this.createSignedUrl(filePath, expiresIn, this.BUCKET_NAME);
    } catch (error) {
      logger.error('Failed to create signed URL for submission file', {
        error,
        filePath
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate file access URL',
      });
    }
  }

  /**
   * Delete submission file
   */
  async deleteSubmissionFile(filePath: string, submissionId: string): Promise<void> {
    try {
      await this.deleteFile(this.BUCKET_NAME, filePath);

      logger.info('Submission file deleted', {
        filePath,
        submissionId
      });
    } catch (error) {
      logger.error('Failed to delete submission file', {
        error,
        filePath,
        submissionId
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete submission file',
      });
    }
  }

  /**
   * Get submission files for a submission
   */
  async getSubmissionFiles(submissionId: string): Promise<string[]> {
    try {
      const folderPath = `submissions/${submissionId}`;
      const { data, error } = await this.supabaseClient.storage
        .from(this.BUCKET_NAME)
        .list(folderPath);

      if (error) {
        throw error;
      }

      return data?.map(file => file.name) || [];
    } catch (error) {
      logger.error('Failed to list submission files', {
        error,
        submissionId
      });
      return [];
    }
  }

  /**
   * Validate submission file
   */
  private async validateSubmissionFile(file: File | Buffer, fileName: string): Promise<void> {
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
        message: `File type ${mimeType} is not allowed for submissions`,
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
   * Sanitize file name for storage
   */
  private sanitizeFileName(fileName: string): string {
    // Remove special characters and spaces
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    // Add timestamp to prevent conflicts
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    const nameWithoutExt = sanitized.replace(/\.[^/.]+$/, '');
    
    return `${nameWithoutExt}_${timestamp}.${extension}`;
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Detect MIME type from file extension
   */
  private detectMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return mimeMap[extension || ''] || 'application/octet-stream';
  }
}

// Export singleton instance
export const submissionStorageService = new SubmissionStorageService();
