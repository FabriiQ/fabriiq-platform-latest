import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ResourceService } from "../services/resource.service";
import { SystemStatus } from "../types/user";
import { ResourceAccess, ResourceType } from "../types/resource";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceClient, storageConfig } from "@/lib/supabase/config";
import { SupabaseStorageService } from "@/lib/supabase/storage.service";
import { PersonalResourcesStorageService } from "@/lib/supabase/personal-resources-storage.service";
import { ComplianceAuditService } from "../services/compliance-audit.service";
import { logger } from "../utils/logger";

// Input validation schemas
const createResourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.nativeEnum(ResourceType),
  url: z.string(),
  access: z.nativeEnum(ResourceAccess),
  ownerId: z.string(),
  parentId: z.string().optional(),
  subjectId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateResourceSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  url: z.string().optional(),
  access: z.nativeEnum(ResourceAccess).optional(),
  parentId: z.string().optional(),
  subjectId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "ARCHIVED",
    "DELETED",
    "ARCHIVED_CURRENT_YEAR",
    "ARCHIVED_PREVIOUS_YEAR",
    "ARCHIVED_HISTORICAL",
  ]).transform(val => val as SystemStatus).optional(),
});

const listResourcesSchema = z.object({
  type: z.nativeEnum(ResourceType).optional(),
  access: z.nativeEnum(ResourceAccess).optional(),
  ownerId: z.string(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "ARCHIVED",
    "DELETED",
    "ARCHIVED_CURRENT_YEAR",
    "ARCHIVED_PREVIOUS_YEAR",
    "ARCHIVED_HISTORICAL",
  ]).transform(val => val as SystemStatus).optional(),
  search: z.string().optional(),
  skip: z.number().optional(),
  take: z.number().optional(),
});

const resourcePermissionSchema = z.object({
  resourceId: z.string(),
  userId: z.string(),
  access: z.nativeEnum(ResourceAccess),
  settings: z.record(z.unknown()).optional(),
});

const bulkCreateSchema = z.object({
  resources: z.array(createResourceSchema),
});

export const resourceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.createResource(input);
    }),

  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(), // base64 encoded file data
      mimeType: z.string(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, 'base64');

        // Determine if this is a personal resource
        const isPersonalResource = !input.folder || input.folder === 'personal' || input.folder === 'resources';

        let result: any;

        if (isPersonalResource) {
          // Use GDPR/PDPL/FERPA compliant storage for personal resources
          const personalStorageService = new PersonalResourcesStorageService(ctx.prisma);
          result = await personalStorageService.uploadPersonalResource(buffer, {
            userId: ctx.session.user.id,
            fileName: input.fileName,
            folder: input.folder || 'personal',
            metadata: {
              mimeType: input.mimeType,
              uploadSource: 'resource-dialog',
            }
          });
        } else {
          // Use regular storage for shared/class resources
          const storageService = new SupabaseStorageService();
          result = await storageService.uploadFile(buffer, input.fileName, {
            bucket: 'misc-content', // This bucket accepts all MIME types
            folder: input.folder,
            maxSize: 50 * 1024 * 1024, // 50MB limit
            allowedTypes: [], // Empty array to bypass MIME type validation
          });
        }

        logger.info('Resource file uploaded via API', {
          fileName: input.fileName,
          size: result.size,
          url: result.url,
          userId: ctx.session.user.id,
          bucket: 'misc-content',
          isPersonalResource,
          complianceApplied: isPersonalResource ? ['GDPR', 'PDPL', 'FERPA'] : ['basic'],
        });

        return result;
      } catch (error) {
        logger.error('Error in resource uploadFile API', {
          error,
          userId: ctx.session?.user?.id || 'unknown',
          fileName: input.fileName
        });
        throw error;
      }
    }),

  get: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.getResource(input);
    }),

  update: protectedProcedure
    .input(updateResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.updateResource(input);
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.deleteResource(input);
    }),

  list: protectedProcedure
    .input(listResourcesSchema)
    .query(async ({ ctx, input }) => {
      const { ownerId } = input;
      const service = new ResourceService({ prisma: ctx.prisma });
      
      if (ownerId) {
        return service.getResourcesByOwner(ownerId);
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Owner ID is required for listing resources"
        });
      }
    }),

  setPermission: protectedProcedure
    .input(resourcePermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.addResourcePermission(input);
    }),

  getStudentResources: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      courseId: z.string().optional(),
      searchTerm: z.string().optional(),
      type: z.nativeEnum(ResourceType).optional(),
      skip: z.number().optional(),
      take: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.getStudentResources(input);
    }),

  removePermission: protectedProcedure
    .input(z.object({
      resourceId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      return service.removeResourcePermission(input.resourceId, input.userId);
    }),

  bulkCreate: protectedProcedure
    .input(bulkCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Handle bulk creation by creating resources one by one
      const service = new ResourceService({ prisma: ctx.prisma });
      const results: Array<{ success: boolean; resource?: any; error?: string }> = [];

      for (const resource of input.resources) {
        try {
          const result = await service.createResource(resource);
          results.push({ success: true, resource: result.resource });
        } catch (error) {
          results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }

      return { results };
    }),

  getStats: protectedProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      const service = new ResourceService({ prisma: ctx.prisma });
      const userId = input || (ctx.session.user as any).id;
      
      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID is required for resource statistics"
        });
      }
      
      // Get resources by owner as a simple stat
      const result = await service.getResourcesByOwner(userId);
      
      if (!result.success || !result.resources) {
        return {
          totalResources: 0,
          byType: {},
          byAccess: {}
        };
      }
      
      const resources = result.resources;
      
      return {
        totalResources: resources.length,
        byType: resources.reduce((acc: Record<string, number>, resource: any) => {
          const type = resource.type as string;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        byAccess: resources.reduce((acc: Record<string, number>, resource: any) => {
          const access = resource.access as string;
          acc[access] = (acc[access] || 0) + 1;
          return acc;
        }, {})
      };
    }),

  // New endpoint for grouped student resources
  getStudentResourcesGrouped: protectedProcedure
    .input(z.object({
      studentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get student enrollments with course/subject structure
      const enrollments = await ctx.prisma.studentEnrollment.findMany({
        where: {
          studentId: input.studentId,
          status: 'ACTIVE',
        },
        include: {
          class: {
            include: {
              courseCampus: {
                include: {
                  course: {
                    include: {
                      subjects: {
                        where: { status: 'ACTIVE' },
                        include: {
                          resources: {
                            where: {
                              status: 'ACTIVE',
                              OR: [
                                { access: 'PUBLIC' },
                                { access: 'SHARED' },
                                { ownerId: input.studentId }
                              ]
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get personal resources (no subject association)
      const personalResources = await ctx.prisma.resource.findMany({
        where: {
          ownerId: input.studentId,
          subjectId: null,
          status: 'ACTIVE',
        },
      });

      // Structure the response
      const result = {
        courses: enrollments.map(enrollment => ({
          id: enrollment.class.courseCampus.course.id,
          name: enrollment.class.courseCampus.course.name,
          code: enrollment.class.courseCampus.course.code,
          subjects: enrollment.class.courseCampus.course.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            code: subject.code,
            resources: subject.resources,
          })),
        })),
        personal: personalResources,
      };

      return result;
    }),

  // New endpoint for grouped teacher resources
  getTeacherResourcesGrouped: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get teacher's assigned subjects
      const assignments = await ctx.prisma.teacherSubjectAssignment.findMany({
        where: {
          qualification: {
            teacherId: input.teacherId,
          },
          status: 'ACTIVE',
        },
        include: {
          courseCampus: {
            include: {
              course: {
                include: {
                  subjects: {
                    where: { status: 'ACTIVE' },
                    include: {
                      resources: {
                        where: {
                          status: 'ACTIVE',
                          ownerId: input.teacherId,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get personal resources
      const personalResources = await ctx.prisma.resource.findMany({
        where: {
          ownerId: input.teacherId,
          subjectId: null,
          status: 'ACTIVE',
        },
      });

      // Structure response similar to student
      const result = {
        courses: assignments.map(assignment => ({
          id: assignment.courseCampus.course.id,
          name: assignment.courseCampus.course.name,
          code: assignment.courseCampus.course.code,
          subjects: assignment.courseCampus.course.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            code: subject.code,
            resources: subject.resources,
          })),
        })),
        personal: personalResources,
      };

      return result;
    }),

  // Secure file serving procedure
  getFileContent: protectedProcedure
    .input(z.object({
      resourceId: z.string(),
      download: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { resourceId, download } = input;
      const userId = ctx.session.user.id;

      // Get resource from database
      const resource = await ctx.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          owner: true,
          subject: true,
        },
      });

      if (!resource) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }

      // Check permissions
      const canAccess = await checkResourceAccess(resource, userId, ctx.prisma);
      if (!canAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // For LINK type resources, return the URL directly
      if (resource.type === 'LINK') {
        return {
          type: 'redirect',
          url: resource.url!,
          mimeType: 'text/html',
          fileName: resource.title,
        };
      }

      // For FILE type resources, get from Supabase
      if (resource.type === 'FILE' && resource.url) {
        try {
          const supabase = createSupabaseServiceClient();

          // Extract file path from URL - handle different URL formats
          let bucket: string;
          let filePath: string;

          if (resource.url.includes('/storage/v1/object/public/')) {
            // Standard Supabase public URL format
            const urlParts = resource.url.split('/');
            const bucketIndex = urlParts.findIndex(part => part === 'storage');
            bucket = urlParts[bucketIndex + 4]; // storage/v1/object/public/{bucket}
            filePath = urlParts.slice(bucketIndex + 5).join('/');
          } else if (resource.url.includes('supabase.co/storage/v1/object/public/')) {
            // Full Supabase URL format
            const urlParts = resource.url.split('/storage/v1/object/public/')[1].split('/');
            bucket = urlParts[0];
            filePath = urlParts.slice(1).join('/');
          } else {
            // Try to extract from any URL containing bucket info
            const match = resource.url.match(/\/([^\/]+)\/(.+)$/);
            if (match) {
              bucket = 'misc-content'; // Default to misc-content bucket
              filePath = match[2];
            } else {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Invalid file URL format',
              });
            }
          }

          // Log download attempt for debugging
          logger.info('Attempting to download file', {
            bucket,
            filePath,
            originalUrl: resource.url,
            resourceId: resource.id,
          });

          // Get file from Supabase
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);

          if (error || !data) {
            logger.error('Supabase download error', {
              error,
              bucket,
              filePath,
              originalUrl: resource.url,
              resourceId: resource.id,
            });
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `File not found: ${error?.message || 'Unknown error'}`,
            });
          }

          // Get file metadata
          const settings = resource.settings as any;
          const mimeType = settings?.mimeType || 'application/octet-stream';
          const fileName = settings?.fileName || resource.title;

          // Convert blob to base64 for tRPC transport
          const arrayBuffer = await data.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          return {
            type: 'file',
            content: base64,
            mimeType,
            fileName,
            size: arrayBuffer.byteLength,
            download,
          };

        } catch (error) {
          logger.error('File serving error', {
            error,
            resourceId: resource.id,
            resourceUrl: resource.url,
            resourceType: resource.type,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid resource type',
      });
    }),
});

// Helper function to check resource access permissions
async function checkResourceAccess(resource: any, userId: string, prisma: any): Promise<boolean> {
  // Owner can always access
  if (resource.ownerId === userId) {
    return true;
  }

  // Check if resource is shared
  if (resource.access === 'PRIVATE') {
    return false;
  }

  // For shared resources, check if user has access through class enrollment or teaching
  if (resource.access === 'SHARED') {
    // Check if user is a student in a class that has access to this resource
    if (resource.subjectId) {
      const studentAccess = await prisma.enrollment.findFirst({
        where: {
          studentId: userId,
          class: {
            courseCampus: {
              course: {
                subjects: {
                  some: {
                    id: resource.subjectId,
                  },
                },
              },
            },
          },
          status: 'ACTIVE',
        },
      });

      if (studentAccess) {
        return true;
      }

      // Check if user is a teacher for this subject
      const teacherAccess = await prisma.teacherSubjectAssignment.findFirst({
        where: {
          qualification: {
            teacherId: userId,
          },
          courseCampus: {
            course: {
              subjects: {
                some: {
                  id: resource.subjectId,
                },
              },
            },
          },
          status: 'ACTIVE',
        },
      });

      if (teacherAccess) {
        return true;
      }
    }

    // For personal resources that are shared, allow access to users in the same campus
    if (!resource.subjectId) {
      const ownerProfile = await prisma.user.findUnique({
        where: { id: resource.ownerId },
        select: { primaryCampusId: true },
      });

      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { primaryCampusId: true },
      });

      if (ownerProfile?.primaryCampusId &&
          userProfile?.primaryCampusId &&
          ownerProfile.primaryCampusId === userProfile.primaryCampusId) {
        return true;
      }
    }
  }

  // Public resources are accessible to everyone
  if (resource.access === 'PUBLIC') {
    return true;
  }

  return false;
}