"use server";

import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";
import { 
  UserGamificationProfile, 
  XPTransaction, 
  Achievement, 
  DailyActivity 
} from "@/lib/gamification/database-schema";

// Initialize user gamification profile
export async function initializeGamificationProfile(userId?: string) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    
    // Check if profile already exists
    const existingProfile = await collection.findOne({ userId: targetUserId });
    if (existingProfile) {
      return { success: true, data: existingProfile };
    }

    // Create new profile
    const newProfile: UserGamificationProfile = {
      userId: targetUserId,
      totalXP: 0,
      currentLevel: 1,
      xpEarnedToday: 0,
      xpEarnedThisWeek: 0,
      xpEarnedThisMonth: 0,
      unlockedAchievements: [],
      achievementProgress: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(),
      streakStartDate: new Date(),
      stats: {
        totalSessions: 0,
        completedSessions: 0,
        canceledSessions: 0,
        averageRating: 0,
        totalReviews: 0,
        averageResponseTime: 0,
        profileCompleteness: 50,
        subjectsMastered: [],
        weeklyGoalStreak: 0
      },
      weeklyGoals: [],
      preferences: {
        weeklySessionGoal: 5,
        notificationsEnabled: true,
        achievementNotifications: true,
        levelUpNotifications: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newProfile);
    return { 
      success: true, 
      data: { ...newProfile, _id: result.insertedId } 
    };
  } catch (error) {
    console.error("Error initializing gamification profile:", error);
    return { success: false, error: "Failed to initialize profile" };
  }
}

// Get user gamification profile
export async function getUserGamificationProfile(userId?: string) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    
    let profile = await collection.findOne({ userId: targetUserId });
    
    // Create profile if it doesn't exist
    if (!profile) {
      const initResult = await initializeGamificationProfile(targetUserId);
      if (!initResult.success) {
        return initResult;
      }
      profile = initResult.data || null;
    }
    
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching gamification profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

// Award XP to user
export async function awardXP(
  actionType: string,
  xpAmount: number,
  description: string,
  relatedId?: string,
  relatedType?: string,
  userId?: string
) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    
    // Start transaction
    const session = client.startSession();
    let result: any;

    try {
      await session.withTransaction(async () => {
        const profileCollection = db.collection<UserGamificationProfile>('userGamificationProfiles');
        const transactionCollection = db.collection<XPTransaction>('xpTransactions');

        // Get current profile
        let profile = await profileCollection.findOne({ userId: targetUserId });
        if (!profile) {
          const initResult = await initializeGamificationProfile(targetUserId);
          if (!initResult.success) throw new Error("Failed to initialize profile");
          profile = initResult.data || null;
        }

        if (!profile) {
          throw new Error("Failed to get user profile");
        }

        // Calculate new XP and level
        const newTotalXP = profile.totalXP + xpAmount;
        const oldLevel = profile.currentLevel;
        const newLevel = calculateLevel(newTotalXP);
        const leveledUp = newLevel > oldLevel;

        // Create XP transaction
        const transaction: XPTransaction = {
          userId: targetUserId,
          actionType,
          xpAwarded: xpAmount,
          description,
          relatedId,
          relatedType,
          achievementsUnlocked: [], // Will be populated by achievement check
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined,
          createdAt: new Date()
        };

        await transactionCollection.insertOne(transaction);

        // Update profile
        const today = new Date();
        const isToday = profile.lastActivityDate.toDateString() === today.toDateString();
        
        const updateData = {
          totalXP: newTotalXP,
          currentLevel: newLevel,
          xpEarnedToday: isToday ? profile.xpEarnedToday + xpAmount : xpAmount,
          lastActivityDate: today,
          updatedAt: new Date()
        };

        await profileCollection.updateOne(
          { userId: targetUserId },
          { $set: updateData }
        );

        // Update daily activity
        await updateDailyActivity(targetUserId, today.toISOString().split('T')[0], xpAmount, actionType);

        result = {
          newTotalXP,
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined,
          oldLevel
        };
      });
    } finally {
      await session.endSession();
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error awarding XP:", error);
    return { success: false, error: "Failed to award XP" };
  }
}

// Update session statistics
export async function updateSessionStats(
  sessionData: {
    completed?: boolean;
    canceled?: boolean;
    rating?: number;
    subjectId?: string;
    durationMinutes?: number;
    appointmentId?: string;
  },
  userId?: string
) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const profileCollection = db.collection<UserGamificationProfile>('userGamificationProfiles');

    // Get current profile
    let profile = await profileCollection.findOne({ userId: targetUserId });
    if (!profile) {
      const initResult = await initializeGamificationProfile(targetUserId);
      if (!initResult.success) return initResult;
      profile = initResult.data || null;
    }

    if (!profile) {
      return { success: false, error: "Failed to get user profile" };
    }

    const updates: any = {};
    let xpAwarded = 0;

    if (sessionData.completed) {
      updates['stats.completedSessions'] = profile.stats.completedSessions + 1;
      updates['stats.totalSessions'] = profile.stats.totalSessions + 1;
      
      // Award XP for session completion
      const xpResult = await awardXP(
        'session_completed', 
        25, 
        'Completed tutoring session',
        sessionData.appointmentId,
        'appointment',
        targetUserId
      );
      if (xpResult.success) xpAwarded += 25;
    }

    if (sessionData.canceled) {
      updates['stats.canceledSessions'] = profile.stats.canceledSessions + 1;
      updates['stats.totalSessions'] = profile.stats.totalSessions + 1;
    }

    if (sessionData.rating) {
      // Calculate new average rating
      const totalReviews = profile.stats.totalReviews + 1;
      const newAverage = ((profile.stats.averageRating * profile.stats.totalReviews) + sessionData.rating) / totalReviews;
      
      updates['stats.averageRating'] = newAverage;
      updates['stats.totalReviews'] = totalReviews;

      // Award bonus XP for perfect rating
      if (sessionData.rating >= 5) {
        const xpResult = await awardXP(
          'session_perfect_rating',
          15,
          'Received 5-star rating',
          sessionData.appointmentId,
          'review',
          targetUserId
        );
        if (xpResult.success) xpAwarded += 15;
      }
    }

    // Update profile if there are changes
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await profileCollection.updateOne(
        { userId: targetUserId },
        { $set: updates }
      );
    }

    return { 
      success: true, 
      data: { 
        profileUpdated: Object.keys(updates).length > 0,
        xpAwarded 
      } 
    };
  } catch (error) {
    console.error("Error updating session stats:", error);
    return { success: false, error: "Failed to update session stats" };
  }
}

// Get user's recent XP transactions
export async function getXPTransactions(userId?: string, limit: number = 10) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<XPTransaction>('xpTransactions');
    
    const transactions = await collection
      .find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching XP transactions:", error);
    return { success: false, error: "Failed to fetch transactions" };
  }
}

// Get daily activity data for heatmap
export async function getDailyActivity(userId?: string, days: number = 30) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<DailyActivity>('dailyActivities');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString().split('T')[0];

    const activities = await collection
      .find({ 
        userId: targetUserId,
        date: { $gte: startDateString }
      })
      .sort({ date: 1 })
      .toArray();

    return { success: true, data: activities };
  } catch (error) {
    console.error("Error fetching daily activity:", error);
    return { success: false, error: "Failed to fetch daily activity" };
  }
}

// Utility functions
function calculateLevel(totalXP: number): number {
  let level = 1;
  while (level < 7) {
    const xpForNextLevel = getXPForLevel(level + 1);
    if (totalXP < xpForNextLevel) break;
    level++;
  }
  return level;
}

function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 2));
}

async function updateDailyActivity(userId: string, date: string, xpEarned: number, actionType: string) {
  try {
    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<DailyActivity>('dailyActivities');
    
    const existingActivity = await collection.findOne({ userId, date });
    
    if (existingActivity) {
      const updates = {
        xpEarned: existingActivity.xpEarned + xpEarned,
        updatedAt: new Date()
      };

      if (actionType === 'session_completed') {
        (updates as any).sessionsCompleted = existingActivity.sessionsCompleted + 1;
      }

      await collection.updateOne({ userId, date }, { $set: updates });
    } else {
      const newActivity: DailyActivity = {
        userId,
        date,
        sessionsCompleted: actionType === 'session_completed' ? 1 : 0,
        xpEarned,
        minutesTutoring: 0,
        studentsHelped: 0,
        averageDailyRating: 0,
        achievementsUnlocked: [],
        leveledUp: false,
        activityLevel: Math.min(4, Math.floor(xpEarned / 25)) as 0 | 1 | 2 | 3 | 4,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(newActivity);
    }
  } catch (error) {
    console.error("Error updating daily activity:", error);
  }
}