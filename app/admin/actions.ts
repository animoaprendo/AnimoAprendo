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

export type AdminFaqItem = {
  _id: string;
  q: string;
  a: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
};

function toSerializableFaqItem(doc: any): AdminFaqItem {
  return {
    _id: String(doc?._id || ""),
    q: String(doc?.q || ""),
    a: String(doc?.a || ""),
    order: typeof doc?.order === "number" ? doc.order : undefined,
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export async function getFaqItems(): Promise<{
  success: boolean;
  data?: AdminFaqItem[];
  error?: string;
}> {
  try {
    const clientPromise = (await import("@/lib/mongodb")).default;
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("faq");

    const docs = await collection.find({}).toArray();

    const sorted = docs.sort((left: any, right: any) => {
      const leftOrder = typeof left?.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right?.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
      const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
      return leftTime - rightTime;
    });

    return {
      success: true,
      data: sorted.map(toSerializableFaqItem),
    };
  } catch (error) {
    console.error("Error fetching FAQ items:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function createFaqItem(payload: {
  q: string;
  a: string;
}): Promise<{ success: boolean; data?: AdminFaqItem; error?: string }> {
  try {
    const question = String(payload?.q || "").trim();
    const answer = String(payload?.a || "").trim();

    if (!question || !answer) {
      return { success: false, error: "Question and answer are required" };
    }

    const clientPromise = (await import("@/lib/mongodb")).default;
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("faq");

    const highest = await collection
      .find({ order: { $type: "number" } })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    const nextOrder = (typeof highest[0]?.order === "number" ? highest[0].order : 0) + 1;

    const newDoc = {
      q: question,
      a: answer,
      order: nextOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await collection.insertOne(newDoc);

    return {
      success: true,
      data: toSerializableFaqItem({ _id: inserted.insertedId, ...newDoc }),
    };
  } catch (error) {
    console.error("Error creating FAQ item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateFaqItem(payload: {
  id: string;
  q: string;
  a: string;
}): Promise<{ success: boolean; data?: AdminFaqItem; error?: string }> {
  try {
    const id = String(payload?.id || "").trim();
    const question = String(payload?.q || "").trim();
    const answer = String(payload?.a || "").trim();

    if (!id || !question || !answer) {
      return { success: false, error: "ID, question, and answer are required" };
    }

    const clientPromise = (await import("@/lib/mongodb")).default;
    const { ObjectId } = await import("mongodb");
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("faq");

    const objectId = new ObjectId(id);

    const updateDoc = {
      q: question,
      a: answer,
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: objectId },
      { $set: updateDoc },
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "FAQ item not found" };
    }

    const updated = await collection.findOne({ _id: objectId });

    return {
      success: true,
      data: toSerializableFaqItem(updated),
    };
  } catch (error) {
    console.error("Error updating FAQ item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteFaqItem(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const targetId = String(id || "").trim();
    if (!targetId) {
      return { success: false, error: "ID is required" };
    }

    const clientPromise = (await import("@/lib/mongodb")).default;
    const { ObjectId } = await import("mongodb");
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("faq");

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(targetId) });
    if (deleteResult.deletedCount === 0) {
      return { success: false, error: "FAQ item not found" };
    }

    const remaining = await collection.find({}).toArray();
    const ordered = remaining.sort((left: any, right: any) => {
      const leftOrder = typeof left?.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right?.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });

    if (ordered.length > 0) {
      await collection.bulkWrite(
        ordered.map((item: any, index: number) => ({
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                order: index + 1,
                updatedAt: new Date(),
              },
            },
          },
        })),
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting FAQ item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function reorderFaqItems(idsInOrder: string[]): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!Array.isArray(idsInOrder) || idsInOrder.length === 0) {
      return { success: false, error: "A non-empty FAQ ID list is required" };
    }

    const clientPromise = (await import("@/lib/mongodb")).default;
    const { ObjectId } = await import("mongodb");
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("faq");

    const normalized = idsInOrder
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (normalized.length === 0) {
      return { success: false, error: "No valid FAQ IDs provided" };
    }

    await collection.bulkWrite(
      normalized.map((id, index) => ({
        updateOne: {
          filter: { _id: new ObjectId(id) },
          update: {
            $set: {
              order: index + 1,
              updatedAt: new Date(),
            },
          },
        },
      })),
    );

    return { success: true };
  } catch (error) {
    console.error("Error reordering FAQ items:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
