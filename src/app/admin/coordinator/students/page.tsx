import { Metadata } from 'next';
import { CoordinatorStudentsClient } from '@/components/coordinator/CoordinatorStudentsClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';

export const metadata: Metadata = {
  title: 'Student Management',
  description: 'Manage students, view performance metrics, and track progress',
};

/**
 * Student Management Page
 *
 * This page displays the student management interface for coordinators.
 * It uses a client component for interactive elements.
 */
export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; programId?: string }>
}) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;

  // Check authentication
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Check if the user is a coordinator or admin
  if (!['COORDINATOR', 'CAMPUS_COORDINATOR', 'SYSTEM_ADMIN', 'CAMPUS_ADMIN'].includes(session.user.userType)) {
    redirect('/dashboard');
  }

  // Validate that user has a primary campus
  if (!session.user.primaryCampusId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            No campus assigned to your account. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Get real campus data from database
  const campus = await prisma.campus.findUnique({
    where: { id: session.user.primaryCampusId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true
    }
  });

  if (!campus) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Campus Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The assigned campus could not be found. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Get coordinator's managed programs to show real program data
  const coordinator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      coordinatorProfile: {
        select: {
          managedPrograms: true
        }
      }
    }
  });

  // Extract program IDs from managed programs
  const managedPrograms = (coordinator?.coordinatorProfile?.managedPrograms as any[]) || [];
  const programIds = managedPrograms.map((p: any) => p.programId).filter(Boolean);

  // Get real program campuses data
  const programCampuses = await prisma.programCampus.findMany({
    where: {
      programId: { in: programIds },
      campusId: campus.id,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      programId: true,
      program: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Student Management
      </h1>
      <CoordinatorStudentsClient
        initialSearch={params.search || ""}
        initialProgramId={params.programId || ""}
        campus={campus}
        programCampuses={programCampuses}
      />
    </div>
  );
}
