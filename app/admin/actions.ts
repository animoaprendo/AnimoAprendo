"use server";

export async function createSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/createSubjectOption`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function editSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function deleteSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error deleting subject option:", error);
    throw error;
  }
}

export async function approveOffer(offerId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: "subjects",
          id: offerId,
          data: { status: "available" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to approve offer");
    }

    return response.json();
  } catch (error) {
    console.error("Error approving offer:", error);
    throw error;
  }
}

export async function rejectOffer(offerId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: "subjects",
          id: offerId,
          data: { status: "rejected" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to reject offer");
    }

    return response.json();
  } catch (error) {
    console.error("Error rejecting offer:", error);
    throw error;
  }
}

export async function takeDownOffer(offerId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: "subjects",
          id: offerId,
          data: { status: "rejected" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to take down offer");
    }

    return response.json();
  } catch (error) {
    console.error("Error taking down offer:", error);
    throw error;
  }
}

export async function getPendingOffers() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getData?collection=subjects`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch offers");
    }

    const result = await response.json();
    return {
      success: true,
      data:
        result.data?.filter((offer: any) => offer.status === "pending") || [],
    };
  } catch (error) {
    console.error("Error fetching pending offers:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Admin Management Functions
export async function createAdminAccount(data: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  password: string;
  adminRole: "admin" | "superadmin";
  college?: string;
  department?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/createAdminAccount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create admin account");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating admin account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function createAdmin(data: {
  userId: string;
  adminRole: "admin";
  college?: string;
  department?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/createAdmin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating admin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateAdminRole(data: {
  editorId: string;
  userId: string;
  adminRole?: "admin" | "superadmin";
  college?: string;
  department?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/updateAdmin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, adminKey: process.env.ADMIN_KEY }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating admin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function removeAdmin(
  userId: string,
  editorId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/removeAdmin`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, editorId, adminKey: process.env.ADMIN_KEY }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to remove admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error removing admin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getAdmins(userId: string): Promise<{
  success: boolean;
  admins?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/getAdmins?userId=${userId}&adminKey=${process.env.ADMIN_KEY}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch admins");
    }

    const result = await response.json();
    return { success: true, admins: result.admins || [] };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Gamification Management Functions
export async function getGamificationLeaderboard(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    // Import MongoDB here to avoid import issues
    const clientPromise = (await import('@/lib/mongodb')).default;
    
    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection('userGamificationProfiles');

    // Get all gamification profiles, sorted by totalXP descending
    const profiles = await collection
      .find({})
      .sort({ totalXP: -1 })
      .limit(1000) // Reasonable limit for leaderboard
      .toArray();
    
    // Serialize MongoDB objects to plain objects
    const serializedData = profiles.map((profile: any) => ({
      userId: profile.userId,
      totalXP: profile.totalXP || 0,
      currentLevel: profile.currentLevel || 1,
      xpEarnedToday: profile.xpEarnedToday || 0,
      xpEarnedThisWeek: profile.xpEarnedThisWeek || 0,
      xpEarnedThisMonth: profile.xpEarnedThisMonth || 0,
      unlockedAchievements: profile.unlockedAchievements || [],
      achievementProgress: profile.achievementProgress || [],
      currentStreak: profile.currentStreak || 0,
      longestStreak: profile.longestStreak || 0,
      lastActivityDate: profile.lastActivityDate ? new Date(profile.lastActivityDate).toISOString() : new Date().toISOString(),
      streakStartDate: profile.streakStartDate ? new Date(profile.streakStartDate).toISOString() : new Date().toISOString(),
      stats: {
        totalSessions: profile.stats?.totalSessions || 0,
        completedSessions: profile.stats?.completedSessions || 0,
        canceledSessions: profile.stats?.canceledSessions || 0,
        averageRating: profile.stats?.averageRating || 0,
        totalReviews: profile.stats?.totalReviews || 0,
        averageResponseTime: profile.stats?.averageResponseTime || 0,
        profileCompleteness: profile.stats?.profileCompleteness || 50,
        subjectsMastered: profile.stats?.subjectsMastered || [],
        weeklyGoalStreak: profile.stats?.weeklyGoalStreak || 0,
      },
      createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      data: serializedData,
    };
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function resetGamificationProfiles(data: {
  resetType: 'all' | 'filtered';
  userColleges?: string[];
  userDepartments?: string[];
  editorId: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/gamification/reset?adminKey=${process.env.ADMIN_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          adminKey: process.env.ADMIN_KEY,
          editorId: data.editorId
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to reset profiles");
    }

    const result = await response.json();
    return { 
      success: true, 
      message: result.message || "Profiles reset successfully" 
    };
  } catch (error) {
    console.error("Error resetting gamification profiles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getUsersForLeaderboard(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getData?collection=users`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch users data");
    }

    const result = await response.json();
    
    // console.log("Fetched Users Data:", result.data);
    // Serialize user data to plain objects
    const serializedUsers = (result.data || []).map((user: any) => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email_addresses?.[0]?.email_address || '',
      emailAddresses: user.email_addresses || [],
      imageUrl: user.imageUrl || '',
      isAdmin: user.isAdmin || false,
      publicMetadata: {
        isAdmin: user.publicMetadata?.isAdmin || false,
        adminRole: user.publicMetadata?.adminRole || '',
        college: user.publicMetadata?.college || '',
        department: user.publicMetadata?.department || '',
        collegeInformation: user.publicMetadata?.collegeInformation || {},
      },
      public_metadata: {
        isAdmin: user.public_metadata?.isAdmin || false,
        adminRole: user.public_metadata?.adminRole || '',
        college: user.public_metadata?.college || '',
        department: user.public_metadata?.department || '',
        collegeInformation: user.public_metadata?.collegeInformation || {},
      },
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      data: serializedUsers,
    };
  } catch (error) {
    console.error("Error fetching users for leaderboard:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSerializedGamificationProfile(userId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/gamification/profile/${userId}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      // Profile doesn't exist, return null
      return { success: false, data: null };
    }

    const result = await response.json();
    
    // Serialize the profile to plain object
    if (result.success && result.data) {
      const profile = result.data;
      const serializedProfile = {
        userId: profile.userId,
        totalXP: profile.totalXP || 0,
        currentLevel: profile.currentLevel || 1,
        xpEarnedToday: profile.xpEarnedToday || 0,
        xpEarnedThisWeek: profile.xpEarnedThisWeek || 0,
        xpEarnedThisMonth: profile.xpEarnedThisMonth || 0,
        unlockedAchievements: profile.unlockedAchievements || [],
        achievementProgress: profile.achievementProgress || [],
        currentStreak: profile.currentStreak || 0,
        longestStreak: profile.longestStreak || 0,
        lastActivityDate: profile.lastActivityDate ? new Date(profile.lastActivityDate).toISOString() : new Date().toISOString(),
        streakStartDate: profile.streakStartDate ? new Date(profile.streakStartDate).toISOString() : new Date().toISOString(),
        stats: {
          totalSessions: profile.stats?.totalSessions || 0,
          completedSessions: profile.stats?.completedSessions || 0,
          canceledSessions: profile.stats?.canceledSessions || 0,
          averageRating: profile.stats?.averageRating || 0,
          totalReviews: profile.stats?.totalReviews || 0,
          averageResponseTime: profile.stats?.averageResponseTime || 0,
          profileCompleteness: profile.stats?.profileCompleteness || 50,
          subjectsMastered: profile.stats?.subjectsMastered || [],
          weeklyGoalStreak: profile.stats?.weeklyGoalStreak || 0,
        },
        weeklyGoals: profile.weeklyGoals || [],
        preferences: profile.preferences || {},
        createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : new Date().toISOString(),
      };
      
      return {
        success: true,
        data: serializedProfile,
      };
    }

    return { success: false, data: null };
  } catch (error) {
    console.error("Error fetching gamification profile:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
