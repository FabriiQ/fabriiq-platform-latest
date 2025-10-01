import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import SystemReportsContent from "./system-reports-content";

export const metadata: Metadata = {
  title: "Reports | System Admin",
  description: "System-wide reports and analytics",
};

export default async function SystemReportsPage() {
  const session = await getSessionCache();

  if (!session) {
    redirect("/login");
  }

  // Get user details to ensure the viewer is a System Admin
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user?.id },
      select: {
        id: true,
        name: true,
        userType: true,
      },
    });

    if (!user || user.userType !== "SYSTEM_ADMIN") {
      redirect("/login");
    }
  } catch (error) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Reports</h1>
          <p className="text-muted-foreground">Comprehensive system-wide analytics and insights</p>
        </div>
      </div>

      {/* Client content */}
      <SystemReportsContent />
    </div>
  );
}

