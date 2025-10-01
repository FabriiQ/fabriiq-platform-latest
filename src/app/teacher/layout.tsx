import { redirect } from "next/navigation";
import { getSessionCache } from "@/utils/session-cache";
import { UserType } from "@prisma/client";
import { logger } from "@/server/api/utils/logger";
import { TeacherLayoutClient } from "@/components/teacher/layout/TeacherLayoutClient";
import { cachedQueries } from "@/server/db";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      logger.debug("No session found in TeacherLayout, redirecting to login");
      return redirect("/login");
    }

    if (session.user.userType !== UserType.CAMPUS_TEACHER && session.user.userType !== 'TEACHER') {
      logger.warn("Non-teacher attempting to access teacher layout", {
        userType: session.user.userType,
        userId: session.user.id
      });
      return redirect("/unauthorized");
    }

    // Get teacher profile from database using cached query
    const user = session.user;

    // Use cached query to fetch the teacher profile from the database with optimized timeout
    const dbUser = await cachedQueries.getCachedQuery(
      `teacher-profile:${user.id}`,
      async () => {
        try {
          // First try to get user data with extended timeout
          let result;
          try {
            result = await Promise.race([
              cachedQueries.getUserWithCache(user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('User query timeout')), 5000) // Increased to 5 seconds
              )
            ]);
          } catch (error) {
            logger.warn("User query timed out, trying direct database query", { userId: user.id });
            // Fallback to direct database query
            const { prisma } = await import("@/server/db");
            result = await prisma.user.findUnique({
              where: { id: user.id },
              select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                status: true,
                primaryCampusId: true,
                institutionId: true
              }
            });
          }

          if (!result) {
            logger.warn("User not found in database", { userId: user.id });
            return null;
          }

          // Get teacher profile separately if user exists with optimized query
          if (result.userType === UserType.CAMPUS_TEACHER || result.userType === 'TEACHER') {
            try {
              const teacherProfile = await cachedQueries.getCachedQuery(
                `teacher-profile-data:${user.id}`,
                async () => {
                  const { prisma } = await import("@/server/db");
                  // Use Promise.race for timeout protection on teacher profile query
                  return await Promise.race([
                    prisma.teacherProfile.findFirst({
                      where: { userId: user.id },
                      select: { id: true, employeeId: true, department: true }
                    }),
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Teacher profile query timeout')), 3000) // 3 second timeout
                    )
                  ]) as any;
                },
                5 * 60 * 1000 // 5 minute cache for teacher profile
              );

              return {
                ...result,
                teacherProfile
              };
            } catch (error) {
              logger.warn("Failed to fetch teacher profile, creating minimal profile", { userId: user.id, error: String(error) });
              // Return user data with minimal teacher profile
              return {
                ...result,
                teacherProfile: {
                  id: `temp-${user.id}`,
                  employeeId: null,
                  department: null
                }
              };
            }
          }

          return { ...result, teacherProfile: null };
        } catch (error) {
          logger.error("Failed to fetch user data", { userId: user.id, error: String(error) });
          // Return minimal user data from session to prevent complete failure
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.userType,
            status: 'ACTIVE',
            primaryCampusId: user.primaryCampusId,
            institutionId: user.institutionId,
            teacherProfile: {
              id: `temp-${user.id}`,
              employeeId: null,
              department: null
            }
          };
        }
      },
      5 * 60 * 1000 // Reduced cache time to 5 minutes for more frequent updates
    );

    if (!dbUser) {
      logger.error("User not found in database", { userId: user.id });
      // Instead of redirecting, try to create a minimal working state
      const fallbackUser = {
        id: user.id,
        name: user.name || "Teacher",
        email: user.email || "",
        userType: user.userType,
        status: 'ACTIVE' as const,
        primaryCampusId: user.primaryCampusId,
        institutionId: user.institutionId,
        teacherProfile: {
          id: `fallback-${user.id}`,
          employeeId: null,
          department: null
        }
      };

      logger.info("Using fallback user data for teacher", { userId: user.id });

      return (
        <TeacherLayoutClient
          teacherId={fallbackUser.teacherProfile.id}
          userName={fallbackUser.name}
          userEmail={fallbackUser.email}
          userImage={undefined}
        >
          {children}
        </TeacherLayoutClient>
      );
    }

    // Auto-create teacher profile if it doesn't exist
    let teacherProfile = dbUser.teacherProfile;
    if (!teacherProfile?.id) {
      logger.warn("Teacher profile not found, creating one", { userId: user.id });
      try {
        const { prisma } = await import("@/server/db");
        teacherProfile = await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            specialization: null,
            qualifications: [],
            certifications: [],
            experience: [],
            expertise: [],
            publications: [],
            achievements: []
          }
        });
        logger.info("Teacher profile created successfully", { userId: user.id, teacherProfileId: teacherProfile.id });
      } catch (error) {
        logger.error("Failed to create teacher profile", { userId: user.id, error: String(error) });
        return redirect("/unauthorized");
      }
    }

    const teacherId = teacherProfile.id;

    return (
      <TeacherLayoutClient
        teacherId={teacherId}
        userName={dbUser.name || "Teacher"}
        userEmail={dbUser.email || ""}
        userImage={undefined}
      >
        {children}
      </TeacherLayoutClient>
    );
  } catch (error) {
    logger.error("Error in TeacherLayout", { error });
    return redirect("/login");
  }
}