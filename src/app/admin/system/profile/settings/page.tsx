import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { UserType } from "@prisma/client";
import { logger } from "@/server/api/utils/logger";
import { AdminSettingsClient } from "@/components/admin/settings/AdminSettingsClient";

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Manage your personal profile settings and preferences",
};

export default async function SystemAdminProfileSettingsPage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        userType: true,
        phoneNumber: true,
        dateOfBirth: true,
        profileData: true,
      }
    });

    if (!user) {
      logger.error("User not found", { userId: session.user.id });
      return redirect("/login");
    }

    if (user.userType !== UserType.SYSTEM_ADMIN) {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    // Extract profile data
    const profileData = user.profileData as Record<string, any> || {};
    
    const initialData = {
      displayName: user.name || '',
      email: user.email || '',
      username: user.username,
      bio: profileData.bio || '',
      language: profileData.language || 'en',
      timezone: profileData.timezone || 'UTC',
      showEmail: profileData.showEmail || false,
      showBio: profileData.showBio !== false,
      // Admin-specific fields
      department: profileData.department || 'System Administration',
      position: profileData.position || 'System Administrator',
      // Settings
      emailNotifications: profileData.emailNotifications !== false,
      pushNotifications: profileData.pushNotifications !== false,
      weeklyDigest: profileData.weeklyDigest !== false,
      marketingEmails: profileData.marketingEmails || false,
      profileVisibility: profileData.profileVisibility || 'public',
      showOnlineStatus: profileData.showOnlineStatus !== false,
      allowDirectMessages: profileData.allowDirectMessages !== false,
      theme: profileData.theme || 'system',
      twoFactorEnabled: profileData.twoFactorEnabled || false,
      sessionTimeout: profileData.sessionTimeout || 60,
    };

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal profile settings and preferences
          </p>
        </div>
        
        <AdminSettingsClient 
          userId={user.id} 
          initialData={initialData}
          userType={user.userType}
        />
      </div>
    );

  } catch (error) {
    logger.error("Error loading system admin profile settings", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Settings</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your settings. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
