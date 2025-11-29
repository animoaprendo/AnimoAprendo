// API Service Layer for Gamification Database Operations
import { MongoClient, Db, Collection } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { 
  UserGamificationProfile, 
  XPTransaction, 
  Achievement, 
  DailyActivity,
  GamificationDashboardData 
} from './database-schema';

export class GamificationService {
  private db: Db;
  
  constructor(database?: Db) {
    this.db = database || null as any; // Will be set in initialize
  }
  
  private async initialize() {
    if (!this.db) {
      const client = await clientPromise;
      this.db = client.db('gamification');
    }
    return this.db;
  }

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserGamificationProfile | null> {
    const db = await this.initialize();
    const collection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    return await collection.findOne({ userId });
  }

  async createUserProfile(userId: string): Promise<UserGamificationProfile> {
    const db = await this.initialize();
    const collection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    
    const newProfile: UserGamificationProfile = {
      userId,
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
    return { ...newProfile, _id: result.insertedId };
  }

  async updateUserProfile(userId: string, updates: Partial<UserGamificationProfile>): Promise<void> {
    const db = await this.initialize();
    const collection = db.collection<UserGamificationProfile>('userGamificationProfiles');
    await collection.updateOne(
      { userId },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  // XP and Achievement Operations
  async awardXP(
    userId: string, 
    actionType: string, 
    xpAmount: number, 
    description: string,
    relatedId?: string,
    relatedType?: string
  ): Promise<{ 
    newTotalXP: number; 
    leveledUp: boolean; 
    newLevel?: number; 
    achievementsUnlocked: string[] 
  }> {
    const db = await this.initialize();
    const client = await clientPromise;
    const session = client.startSession();
    let result: any;

    try {
      await session.withTransaction(async () => {
        // Get current profile
        const profile = await this.getUserProfile(userId);
        if (!profile) throw new Error('User profile not found');

        // Calculate new XP totals
        const newTotalXP = profile.totalXP + xpAmount;
        const oldLevel = profile.currentLevel;
        const newLevel = this.calculateLevel(newTotalXP);
        const leveledUp = newLevel > oldLevel;

        // Check for new achievements
        const achievementsUnlocked = await this.checkNewAchievements(userId, profile);

        // Create XP transaction record
        const transaction: XPTransaction = {
          userId,
          actionType,
          xpAwarded: xpAmount,
          description,
          relatedId,
          relatedType,
          achievementsUnlocked,
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined,
          createdAt: new Date()
        };

        // Insert transaction
        const transactionCollection = db.collection<XPTransaction>('xpTransactions');
        await transactionCollection.insertOne(transaction);

        // Update user profile
        const today = new Date().toISOString().split('T')[0];
        const updateData: Partial<UserGamificationProfile> = {
          totalXP: newTotalXP,
          currentLevel: newLevel,
          xpEarnedToday: this.isToday(profile.lastActivityDate) ? 
            profile.xpEarnedToday + xpAmount : xpAmount,
          lastActivityDate: new Date(),
          unlockedAchievements: [...profile.unlockedAchievements, ...achievementsUnlocked],
          updatedAt: new Date()
        };

        await this.updateUserProfile(userId, updateData);

        // Update daily activity
        await this.updateDailyActivity(userId, today, xpAmount, actionType);

        result = {
          newTotalXP,
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined,
          achievementsUnlocked
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  }

  async updateSessionStats(
    userId: string, 
    sessionData: {
      completed?: boolean;
      canceled?: boolean;
      rating?: number;
      subjectId?: string;
      durationMinutes?: number;
    }
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const updates: any = {};

    if (sessionData.completed) {
      updates['stats.completedSessions'] = profile.stats.completedSessions + 1;
      updates['stats.totalSessions'] = profile.stats.totalSessions + 1;
      
      // Award XP for session completion
      await this.awardXP(userId, 'session_completed', 25, 'Completed tutoring session');
    }

    if (sessionData.canceled) {
      updates['stats.canceledSessions'] = profile.stats.canceledSessions + 1;
      updates['stats.totalSessions'] = profile.stats.totalSessions + 1;
    }

    if (sessionData.rating) {
      // Recalculate average rating
      const totalRatings = profile.stats.totalReviews + 1;
      const newAverage = ((profile.stats.averageRating * profile.stats.totalReviews) + sessionData.rating) / totalRatings;
      
      updates['stats.averageRating'] = newAverage;
      updates['stats.totalReviews'] = totalRatings;

      // Award bonus XP for high ratings
      if (sessionData.rating >= 5) {
        await this.awardXP(userId, 'session_perfect_rating', 15, 'Received 5-star rating');
      }
    }

    if (sessionData.subjectId) {
      // Check if this subject should be marked as mastered (20+ sessions)
      const subjectSessions = await this.getSubjectSessionCount(userId, sessionData.subjectId);
      if (subjectSessions >= 20 && !profile.stats.subjectsMastered.includes(sessionData.subjectId)) {
        updates['stats.subjectsMastered'] = [...profile.stats.subjectsMastered, sessionData.subjectId];
        await this.awardXP(userId, 'subject_mastery', 100, `Mastered subject: ${sessionData.subjectId}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.updateUserProfile(userId, updates);
    }

    // Update streak
    await this.updateStreak(userId);
  }

  // Achievement Operations
  async checkNewAchievements(userId: string, profile: UserGamificationProfile): Promise<string[]> {
    const db = await this.initialize();
    const achievementsCollection = db.collection<Achievement>('achievements');
    const allAchievements = await achievementsCollection.find({ isActive: true }).toArray();
    
    const newAchievements: string[] = [];

    for (const achievement of allAchievements) {
      if (profile.unlockedAchievements.includes(achievement.id)) continue;

      const meetsRequirements = achievement.requirements.every(req => {
        return this.checkAchievementRequirement(profile, req);
      });

      if (meetsRequirements) {
        newAchievements.push(achievement.id);
      }
    }

    return newAchievements;
  }

  private checkAchievementRequirement(profile: UserGamificationProfile, requirement: any): boolean {
    const { type, value, comparison } = requirement;
    let actualValue: number = 0;

    switch (type) {
      case 'session_count':
        actualValue = profile.stats.completedSessions;
        break;
      case 'rating_average':
        actualValue = profile.stats.averageRating;
        break;
      case 'streak_days':
        actualValue = profile.currentStreak;
        break;
      case 'total_xp':
        actualValue = profile.totalXP;
        break;
      case 'profile_completeness':
        actualValue = profile.stats.profileCompleteness;
        break;
      case 'response_time':
        actualValue = profile.stats.averageResponseTime;
        break;
      default:
        return false;
    }

    switch (comparison) {
      case 'gte':
        return actualValue >= value;
      case 'lte':
        return actualValue <= value;
      case 'eq':
        return actualValue === value;
      default:
        return false;
    }
  }

  // Streak Operations
  async updateStreak(userId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const today = new Date();
    const lastActivity = profile.lastActivityDate;
    const daysDifference = this.getDaysDifference(lastActivity, today);

    let updates: any = {};

    if (daysDifference === 0) {
      // Same day, no streak change needed
      return;
    } else if (daysDifference === 1) {
      // Consecutive day, increment streak
      updates.currentStreak = profile.currentStreak + 1;
      updates.longestStreak = Math.max(profile.longestStreak, updates.currentStreak);
      
      // Check for streak achievements
      if (updates.currentStreak === 7) {
        await this.awardXP(userId, 'streak_7_days', 30, '7-day activity streak');
      } else if (updates.currentStreak === 30) {
        await this.awardXP(userId, 'streak_30_days', 100, '30-day activity streak');
      }
    } else {
      // Streak broken, reset
      updates.currentStreak = 1;
      updates.streakStartDate = today;
    }

    if (Object.keys(updates).length > 0) {
      await this.updateUserProfile(userId, updates);
    }
  }

  // Dashboard Data
  async getDashboardData(userId: string): Promise<GamificationDashboardData> {
    const db = await this.initialize();
    const profile = await this.getUserProfile(userId) || await this.createUserProfile(userId);
    
    const transactionsCollection = db.collection<XPTransaction>('xpTransactions');
    const achievementsCollection = db.collection<Achievement>('achievements');

    const [recentTransactions, availableAchievements] = await Promise.all([
      transactionsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      
      achievementsCollection
        .find({ isActive: true })
        .toArray()
    ]);

    const currentXPForLevel = this.getXPForLevel(profile.currentLevel);
    const nextLevelXP = this.getXPForLevel(profile.currentLevel + 1);
    const currentLevelProgress = profile.totalXP - currentXPForLevel;
    const xpToNextLevel = nextLevelXP - profile.totalXP;

    const currentWeek = this.getCurrentWeekString();
    const currentWeekGoal = profile.weeklyGoals.find(g => g.week === currentWeek);

    return {
      profile,
      recentTransactions,
      availableAchievements,
      leaderboardPosition: {
        weekly: await this.getUserRank(userId, 'weekly'),
        monthly: await this.getUserRank(userId, 'monthly'),
        allTime: await this.getUserRank(userId, 'allTime')
      },
      nextLevelProgress: {
        currentXP: currentLevelProgress,
        xpToNextLevel: Math.max(0, xpToNextLevel),
        percentage: xpToNextLevel > 0 ? (currentLevelProgress / (currentLevelProgress + xpToNextLevel)) * 100 : 100
      },
      weeklyProgress: {
        targetSessions: currentWeekGoal?.targetSessions || profile.preferences.weeklySessionGoal,
        completedSessions: currentWeekGoal?.completedSessions || 0,
        percentage: currentWeekGoal ? (currentWeekGoal.completedSessions / currentWeekGoal.targetSessions) * 100 : 0
      }
    };
  }

  // Utility Methods
  private calculateLevel(totalXP: number): number {
    let level = 1;
    while (level < 7 && totalXP >= this.getXPForLevel(level + 1)) {
      level++;
    }
    return level;
  }

  private getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(1.5, level - 2));
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private getCurrentWeekString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private async updateDailyActivity(userId: string, date: string, xpEarned: number, actionType: string): Promise<void> {
    const db = await this.initialize();
    const collection = db.collection<DailyActivity>('dailyActivities');
    
    const existingActivity = await collection.findOne({ userId, date });
    
    if (existingActivity) {
      const updates: any = {
        xpEarned: existingActivity.xpEarned + xpEarned,
        updatedAt: new Date()
      };

      if (actionType === 'session_completed') {
        updates.sessionsCompleted = existingActivity.sessionsCompleted + 1;
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
  }

  private async getSubjectSessionCount(userId: string, subjectId: string): Promise<number> {
    // This would require linking to your appointments collection
    // Implementation depends on your existing appointment schema
    return 0; // Placeholder
  }

  private async getUserRank(userId: string, period: 'weekly' | 'monthly' | 'allTime'): Promise<number> {
    // Implementation for leaderboard ranking
    // This would query the leaderboards collection or calculate on-the-fly
    return 1; // Placeholder
  }
}

// Factory function to create service instance
export function createGamificationService(db?: Db): GamificationService {
  return new GamificationService(db);
}

// API Route Helpers
export const GamificationAPI = {
  // POST /api/gamification/award-xp
  awardXP: async (req: any, res: any) => {
    try {
      const { userId, actionType, xpAmount, description, relatedId, relatedType } = req.body;
      
      // Initialize service with gamification database
      const service = createGamificationService();
      
      const result = await service.awardXP(userId, actionType, xpAmount, description, relatedId, relatedType);
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/gamification/dashboard/:userId
  getDashboard: async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const service = createGamificationService();
      
      const data = await service.getDashboardData(userId);
      
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // POST /api/gamification/session-update
  updateSession: async (req: any, res: any) => {
    try {
      const { userId, sessionData } = req.body;
      const service = createGamificationService();
      
      await service.updateSessionStats(userId, sessionData);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};