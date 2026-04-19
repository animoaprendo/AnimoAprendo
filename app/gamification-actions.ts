"use server";

import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { 
  UserGamificationProfile, 
  XPTransaction, 
  Achievement, 
  DailyActivity 
} from "@/lib/gamification/database-schema";

const XP_REWARDS = {
  DAILY_LOGIN: 5,
  TUTEE_REVIEW_SUBMITTED: 10,
  FIRST_BLOOD: 20,
  REPEAT_CUSTOMER_SECOND: 40,
  REPEAT_CUSTOMER_THIRD: 60,
  SPECIALIST_50H: 150,
  VETERAN_100H: 250,
};

const APPROVED_OFFERING_MILESTONES = [
  {
    threshold: 1,
    achievementId: 'approved_offerings_1',
    actionType: 'approved_offerings_milestone_1',
    xpReward: 25,
    description: 'Milestone reached: 1 approved subject offering'
  },
  {
    threshold: 5,
    achievementId: 'approved_offerings_5',
    actionType: 'approved_offerings_milestone_5',
    xpReward: 75,
    description: 'Milestone reached: 5 approved subject offerings'
  },
  {
    threshold: 10,
    achievementId: 'approved_offerings_10',
    actionType: 'approved_offerings_milestone_10',
    xpReward: 150,
    description: 'Milestone reached: 10 approved subject offerings'
  }
];

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
    const mainDb = client.db("main");
    const profileCollection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    const transactionCollection = db.collection<XPTransaction>('xpTransactions');
    const appointmentsCollection = mainDb.collection('appointments');

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
      const alreadyProcessedCompletion = sessionData.appointmentId
        ? await transactionCollection.findOne({
            userId: targetUserId,
            actionType: 'session_completed',
            relatedId: sessionData.appointmentId,
          })
        : null;

      if (!alreadyProcessedCompletion) {
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

      const appointment = await findAppointmentById(appointmentsCollection, sessionData.appointmentId);
      const tuteeId = String(appointment?.tuteeId || "");
      const subject = String(sessionData.subjectId || appointment?.subject || "").trim();

      // Daily Mission: first completed tutoring session of the day.
      const firstBloodCount = await countCompletedSessionsForDay(appointmentsCollection, targetUserId, new Date());
      if (firstBloodCount === 1) {
        const firstBlood = await awardXP(
          'daily_first_blood',
          XP_REWARDS.FIRST_BLOOD,
          'First Blood: completed your first tutoring session today',
          sessionData.appointmentId,
          'appointment',
          targetUserId
        );
        if (firstBlood.success) xpAwarded += XP_REWARDS.FIRST_BLOOD;
      }

      // Repeat Customer mission: 2nd and 3rd completed sessions with same tutee.
      if (tuteeId) {
        const completedWithTutee = await appointmentsCollection.countDocuments({
          tutorId: targetUserId,
          tuteeId,
          status: 'completed'
        });

        if (completedWithTutee === 2 || completedWithTutee === 3) {
          const repeatTier = completedWithTutee;
          const repeatActionType = `repeat_customer_${repeatTier}`;
          const repeatRelatedId = `${targetUserId}:${tuteeId}:${repeatTier}`;
          const alreadyRewarded = await transactionCollection.findOne({
            userId: targetUserId,
            actionType: repeatActionType,
            relatedId: repeatRelatedId,
          });

          if (!alreadyRewarded) {
            const repeatReward = await awardXP(
              repeatActionType,
              repeatTier === 2 ? XP_REWARDS.REPEAT_CUSTOMER_SECOND : XP_REWARDS.REPEAT_CUSTOMER_THIRD,
              `Repeat Customer: completed ${repeatTier} sessions with the same student`,
              repeatRelatedId,
              'relationship_milestone',
              targetUserId
            );

            if (repeatReward.success) {
              xpAwarded += repeatTier === 2
                ? XP_REWARDS.REPEAT_CUSTOMER_SECOND
                : XP_REWARDS.REPEAT_CUSTOMER_THIRD;
            }
          }
        }
      }

      // Milestone Mission: The Specialist (50 hours in one subject).
      if (subject) {
        const subjectHours = await calculateCompletedHoursForSubject(
          appointmentsCollection,
          targetUserId,
          subject
        );
        if (subjectHours >= 50) {
          const subjectKey = slugifyForAction(subject);
          const specialistActionType = `specialist_50h_${subjectKey}`;
          const existingSpecialist = await transactionCollection.findOne({
            userId: targetUserId,
            actionType: specialistActionType,
          });

          if (!existingSpecialist) {
            const specialistReward = await awardXP(
              specialistActionType,
              XP_REWARDS.SPECIALIST_50H,
              `The Specialist: reached 50 tutoring hours in ${subject}`,
              subject,
              'subject_milestone',
              targetUserId
            );
            if (specialistReward.success) xpAwarded += XP_REWARDS.SPECIALIST_50H;
          }
        }
      }

      // Milestone Mission: The Veteran (100 completed tutoring hours total).
      const totalHours = await calculateCompletedHoursTotal(appointmentsCollection, targetUserId);
      if (totalHours >= 100) {
        const veteranActionType = 'veteran_100h';
        const existingVeteran = await transactionCollection.findOne({
          userId: targetUserId,
          actionType: veteranActionType,
        });

        if (!existingVeteran) {
          const veteranReward = await awardXP(
            veteranActionType,
            XP_REWARDS.VETERAN_100H,
            'The Veteran: reached 100 total completed tutoring hours',
            targetUserId,
            'career_milestone',
            targetUserId
          );
          if (veteranReward.success) xpAwarded += XP_REWARDS.VETERAN_100H;
        }
      }
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

// Get total approved subject offerings for milestone tracking/display
export async function getApprovedSubjectOfferingsCount(userId?: string) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;

    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("main");
    const subjectsCollection = db.collection('subjects');

    const approvedOfferingsCount = await subjectsCollection.countDocuments({
      userId: targetUserId,
      status: 'available'
    });

    return {
      success: true,
      data: {
        approvedOfferingsCount
      }
    };
  } catch (error) {
    console.error("Error fetching approved subject offerings count:", error);
    return { success: false, error: "Failed to fetch approved subject offerings count" };
  }
}

// Check and award milestone XP for approved subject offerings (1, 5, 10)
export async function processApprovedSubjectOfferingMilestones(
  targetUserId: string,
  subjectId?: string
) {
  try {
    if (!targetUserId) {
      return { success: false, error: "User ID is required" };
    }

    const client = await clientPromise;
    const gamificationDb = client.db("gamification");
    const mainDb = client.db("main");

    const profileCollection = gamificationDb.collection<UserGamificationProfile>('userGamificationProfiles');
    const transactionCollection = gamificationDb.collection<XPTransaction>('xpTransactions');
    const subjectsCollection = mainDb.collection('subjects');

    // Ensure the user has a gamification profile before tracking milestone unlocks
    let profile = await profileCollection.findOne({ userId: targetUserId });
    if (!profile) {
      const initResult = await initializeGamificationProfile(targetUserId);
      if (!initResult.success) {
        return { success: false, error: initResult.error || "Failed to initialize profile" };
      }
      profile = await profileCollection.findOne({ userId: targetUserId });
    }

    if (!profile) {
      return { success: false, error: "Failed to load user profile" };
    }

    const approvedOfferingsCount = await subjectsCollection.countDocuments({
      userId: targetUserId,
      status: 'available'
    });

    const unlockedNow: string[] = [];
    let totalXPAwarded = 0;

    for (const milestone of APPROVED_OFFERING_MILESTONES) {
      if (approvedOfferingsCount < milestone.threshold) {
        continue;
      }

      if (profile.unlockedAchievements.includes(milestone.achievementId)) {
        continue;
      }

      const existingMilestoneTransaction = await transactionCollection.findOne({
        userId: targetUserId,
        actionType: milestone.actionType
      });

      if (existingMilestoneTransaction) {
        continue;
      }

      const xpResult = await awardXP(
        milestone.actionType,
        milestone.xpReward,
        milestone.description,
        subjectId || `approved-offerings-${milestone.threshold}`,
        'subject',
        targetUserId
      );

      if (!xpResult.success) {
        continue;
      }

      totalXPAwarded += milestone.xpReward;
      unlockedNow.push(milestone.achievementId);

      await profileCollection.updateOne(
        { userId: targetUserId },
        {
          $addToSet: {
            unlockedAchievements: milestone.achievementId,
            achievementProgress: {
              achievementId: milestone.achievementId,
              progress: milestone.threshold,
              maxProgress: milestone.threshold,
              unlockedAt: new Date()
            }
          },
          $set: { updatedAt: new Date() }
        }
      );

      profile.unlockedAchievements.push(milestone.achievementId);
    }

    return {
      success: true,
      data: {
        approvedOfferingsCount,
        unlockedMilestones: unlockedNow,
        totalXPAwarded
      }
    };
  } catch (error) {
    console.error("Error processing approved subject offering milestones:", error);
    return { success: false, error: "Failed to process approved subject offering milestones" };
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

// Track one site-visit activity row per user per day.
export async function trackDailySiteVisit(userId?: string) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;

    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<{
      userId: string;
      date: string;
      createdAt: Date;
      updatedAt: Date;
    }>("dailyLogin");

    const date = new Date().toISOString().split("T")[0];
    const now = new Date();

    await collection.updateOne(
      { userId: targetUserId, date },
      {
        $setOnInsert: {
          userId: targetUserId,
          date,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    const existingDailyLoginXP = await db.collection<XPTransaction>('xpTransactions').findOne({
      userId: targetUserId,
      actionType: 'daily_login',
      relatedId: date,
    });

    if (!existingDailyLoginXP) {
      await awardXP(
        'daily_login',
        XP_REWARDS.DAILY_LOGIN,
        'Daily Mission: logged in today',
        date,
        'daily_login',
        targetUserId
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking daily site visit:", error);
    return { success: false, error: "Failed to track daily site visit" };
  }
}

// Calculate current consecutive-day streak from dailyLogin records.
export async function getDailyLoginStreak(userId?: string) {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;

    if (!targetUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection<{ userId: string; date: string }>("dailyLogin");

    const rows = await collection
      .find({ userId: targetUserId })
      .project({ _id: 0, date: 1 })
      .sort({ date: -1 })
      .limit(400)
      .toArray();

    const dateSet = new Set(rows.map((row) => row.date));

    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    let streakDays = 0;
    while (true) {
      const dayKey = cursor.toISOString().split("T")[0];
      if (!dateSet.has(dayKey)) break;

      streakDays += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return { success: true, data: { streakDays } };
  } catch (error) {
    console.error("Error fetching daily login streak:", error);
    return { success: false, error: "Failed to fetch daily login streak" };
  }
}

export async function awardTutorReviewXP(payload: {
  reviewerId: string;
  appointmentId: string;
  reviewId?: string;
}) {
  try {
    const reviewerId = String(payload?.reviewerId || '').trim();
    const appointmentId = String(payload?.appointmentId || '').trim();
    const reviewId = String(payload?.reviewId || '').trim();

    if (!reviewerId || !appointmentId) {
      return { success: false, error: 'reviewerId and appointmentId are required' };
    }

    const relatedId = reviewId || appointmentId;

    const client = await clientPromise;
    const db = client.db('gamification');
    const transactionCollection = db.collection<XPTransaction>('xpTransactions');

    const existingTransaction = await transactionCollection.findOne({
      userId: reviewerId,
      actionType: 'tutee_review_submitted',
      relatedId,
    });

    if (existingTransaction) {
      return { success: true, data: { awarded: false, reason: 'already_awarded' } };
    }

    const xpResult = await awardXP(
      'tutee_review_submitted',
      XP_REWARDS.TUTEE_REVIEW_SUBMITTED,
      'Submitted a review for a tutee',
      relatedId,
      'review',
      reviewerId
    );

    if (!xpResult.success) {
      return { success: false, error: xpResult.error || 'Failed to award tutor review XP' };
    }

    return {
      success: true,
      data: {
        awarded: true,
        xpAwarded: XP_REWARDS.TUTEE_REVIEW_SUBMITTED,
      },
    };
  } catch (error) {
    console.error('Error awarding tutor review XP:', error);
    return { success: false, error: 'Failed to award tutor review XP' };
  }
}

async function findAppointmentById(
  collection: any,
  appointmentId?: string
) {
  if (!appointmentId) return null;

  try {
    return await collection.findOne({ _id: new ObjectId(appointmentId) });
  } catch {
    return await collection.findOne({ messageId: appointmentId });
  }
}

function getAppointmentDurationMinutes(appointment: any): number {
  const direct = Number(appointment?.durationMinutes ?? appointment?.duration ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const start = appointment?.datetimeISO ? new Date(appointment.datetimeISO) : null;
  const end = appointment?.endDate ? new Date(appointment.endDate) : null;
  if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start) {
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes > 0) return minutes;
  }

  return 60;
}

async function countCompletedSessionsForDay(
  collection: any,
  tutorId: string,
  day: Date
): Promise<number> {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return collection.countDocuments({
    tutorId,
    status: 'completed',
    datetimeISO: {
      $gte: start.toISOString(),
      $lt: end.toISOString(),
    },
  });
}

async function calculateCompletedHoursForSubject(
  collection: any,
  tutorId: string,
  subject: string
): Promise<number> {
  const appointments = await collection
    .find({ tutorId, status: 'completed', subject }, { projection: { durationMinutes: 1, duration: 1, datetimeISO: 1, endDate: 1 } })
    .toArray();

  const totalMinutes = appointments.reduce(
    (sum: number, appointment: any) => sum + getAppointmentDurationMinutes(appointment),
    0
  );

  return totalMinutes / 60;
}

async function calculateCompletedHoursTotal(
  collection: any,
  tutorId: string
): Promise<number> {
  const appointments = await collection
    .find({ tutorId, status: 'completed' }, { projection: { durationMinutes: 1, duration: 1, datetimeISO: 1, endDate: 1 } })
    .toArray();

  const totalMinutes = appointments.reduce(
    (sum: number, appointment: any) => sum + getAppointmentDurationMinutes(appointment),
    0
  );

  return totalMinutes / 60;
}

function slugifyForAction(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'subject';
}