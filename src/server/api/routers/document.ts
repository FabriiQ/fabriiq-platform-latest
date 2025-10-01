import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { FileStorageService } from "../services/file-storage.service";

const uploadDocumentSchema = z.object({
  enrollmentId: z.string(),
  documentType: z.string(),
  title: z.string(),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  files: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string(),
  })),
});

export const documentRouter = createTRPCRouter({
  // Upload enrollment document
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const fileStorageService = new FileStorageService({ prisma: ctx.prisma });
      
      try {
        // Create file records for each uploaded file
        const filePromises = input.files.map(file => 
          fileStorageService.createFile({
            filename: file.name,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            path: file.url,
            url: file.url,
            isPublic: false,
            entityType: 'enrollment_document',
            entityId: input.enrollmentId,
            ownerId: ctx.session.user.id,
            tags: [input.documentType, 'enrollment'],
          })
        );

        const results = await Promise.all(filePromises);
        
        return {
          success: true,
          files: results.map(r => r.file),
          message: `Successfully uploaded ${input.files.length} document(s)`,
        };
      } catch (error) {
        console.error('Document upload error:', error);
        throw new Error(`Failed to save document metadata: ${(error as Error).message}`);
      }
    }),

  // Get enrollment documents
  getDocuments: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const fileStorageService = new FileStorageService({ prisma: ctx.prisma });
      
      try {
        // Get files by entity type and ID
        const files = await ctx.prisma.file.findMany({
          where: {
            entityType: 'enrollment_document',
            entityId: input.enrollmentId,
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          success: true,
          documents: files.map(file => ({
            id: file.id,
            name: file.originalName,
            type: file.tags?.[0] || 'document',
            url: file.url || file.path,
            fileSize: file.size,
            mimeType: file.mimeType,
            createdAt: file.createdAt,
            createdBy: file.owner,
          })),
        };
      } catch (error) {
        console.error('Get documents error:', error);
        throw new Error(`Failed to retrieve documents: ${(error as Error).message}`);
      }
    }),

  // Delete document
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Soft delete the file record
        await ctx.prisma.file.update({
          where: { id: input.id },
          data: { status: 'INACTIVE' },
        });

        return {
          success: true,
          message: 'Document deleted successfully',
        };
      } catch (error) {
        console.error('Delete document error:', error);
        throw new Error(`Failed to delete document: ${(error as Error).message}`);
      }
    }),
});
