// Database Schema for Gamification System
// This file defines the MongoDB/database structure for gamification data

export interface UserGamificationProfile {
  _id?: string;
  userId: string; // References your existing user ID (Clerk ID)
  
  // XP and Level Data
  totalXP: number;
  currentLevel: number;
  xpEarnedToday: number;
  xpEarnedThisWeek: number;
  xpEarnedThisMonth: number;
  
  // Achievement Progress
  unlockedAchievements: string[]; // Array of achievement IDs
  achievementProgress: {
    achievementId: string;
    progress: number;
    maxProgress: number;
    unlockedAt?: Date;
  }[];
  
  // Streak Data
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  streakStartDate: Date;
  
  // Statistics
  stats: {
    totalSessions: number;
    completedSessions: number;
    canceledSessions: number;
    averageRating: number;
    totalReviews: number;
    averageResponseTime: number; // in hours
    profileCompleteness: number; // percentage
    subjectsMastered: string[]; // subject IDs
    weeklyGoalStreak: number; // weeks in a row hitting weekly goals
  };
  
  // Weekly Goals
  weeklyGoals: {
    week: string; // ISO week string (e.g., "2025-W48")
    targetSessions: number;
    completedSessions: number;
    completed: boolean;
    completedAt?: Date;
  }[];
  
  // Preferences
  preferences: {
    weeklySessionGoal: number;
    notificationsEnabled: boolean;
    achievementNotifications: boolean;
    levelUpNotifications: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface XPTransaction {
  _id?: string;
  userId: string;
  
  // Transaction Details
  actionType: string; // 'session_completed', 'perfect_rating', etc.
  xpAwarded: number;
  description: string;
  
  // Context
  relatedId?: string; // appointment ID, review ID, etc.
  relatedType?: string; // 'appointment', 'review', 'profile_update'
  
  // Achievement Unlocks (if any triggered by this transaction)
  achievementsUnlocked?: string[];
  leveledUp?: boolean;
  newLevel?: number;
  
  // Metadata
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface Achievement {
  _id?: string;
  
  // Basic Info
  id: string; // Unique identifier (e.g., 'first_session')
  name: string;
  description: string;
  icon: string; // emoji or icon identifier
  
  // Classification
  category: 'sessions' | 'reviews' | 'streak' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  
  // Requirements
  requirements: {
    type: string; // 'session_count', 'rating_average', 'streak_days', etc.
    value: number;
    comparison: 'gte' | 'lte' | 'eq'; // greater than equal, less than equal, equal
    additionalConditions?: any; // flexible object for complex conditions
  }[];
  
  // Progress Tracking
  isProgressBased: boolean;
  maxProgress?: number;
  
  // Availability
  isActive: boolean;
  seasonalEvent?: {
    startDate: Date;
    endDate: Date;
    eventName: string;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // admin user ID
}

export interface DailyActivity {
  _id?: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  
  // Daily Metrics
  sessionsCompleted: number;
  xpEarned: number;
  minutesTutoring: number;
  studentsHelped: number;
  averageDailyRating: number;
  
  // Achievements unlocked this day
  achievementsUnlocked: string[];
  leveledUp: boolean;
  
  // Activity markers for heatmap
  activityLevel: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = very high activity
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Leaderboard {
  _id?: string;
  
  // Leaderboard Info
  type: 'weekly' | 'monthly' | 'allTime' | 'seasonal';
  period: string; // e.g., '2025-W48', '2025-11', 'all-time'
  category: 'xp' | 'sessions' | 'rating' | 'streak';
  
  // Rankings
  rankings: {
    userId: string;
    rank: number;
    score: number; // XP, session count, rating, etc.
    userName: string;
    userAvatar?: string;
    previousRank?: number; // for showing rank changes
  }[];
  
  // Metadata
  lastUpdated: Date;
  nextUpdate: Date;
  isActive: boolean;
}

export interface Badge {
  _id?: string;
  
  // Badge Info
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  
  // Requirements
  requirements: {
    achievementIds?: string[]; // unlock when these achievements are earned
    xpThreshold?: number;
    levelRequired?: number;
    customLogic?: string; // for complex requirements
  };
  
  // Visual
  gradient?: {
    from: string;
    to: string;
  };
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadge {
  _id?: string;
  userId: string;
  badgeId: string;
  
  // Unlock Info
  unlockedAt: Date;
  unlockedBy: string; // system, admin, or event
  
  // Display
  isDisplayed: boolean; // user can choose to display or hide
  displayOrder: number;
}

// Extended User Profile (add to existing user schema)
export interface ExtendedUserProfile {
  // ... existing user fields ...
  
  // Gamification Quick Access
  gamification: {
    currentLevel: number;
    totalXP: number;
    currentStreak: number;
    weeklyGoalProgress: number;
    displayBadges: string[]; // badge IDs to show on profile
    title?: string; // custom title earned through achievements
  };
}

// API Response Types
export interface GamificationDashboardData {
  profile: UserGamificationProfile;
  recentTransactions: XPTransaction[];
  availableAchievements: Achievement[];
  leaderboardPosition: {
    weekly: number;
    monthly: number;
    allTime: number;
  };
  nextLevelProgress: {
    currentXP: number;
    xpToNextLevel: number;
    percentage: number;
  };
  weeklyProgress: {
    targetSessions: number;
    completedSessions: number;
    percentage: number;
  };
}

// Database Indexes for Performance
export const DatabaseIndexes = {
  UserGamificationProfile: [
    { userId: 1 }, // Primary lookup
    { totalXP: -1 }, // Leaderboard sorting
    { currentLevel: -1 }, // Level-based queries
    { "stats.completedSessions": -1 }, // Session-based queries
    { lastActivityDate: -1 }, // Streak calculations
  ],
  
  XPTransaction: [
    { userId: 1, createdAt: -1 }, // User transaction history
    { actionType: 1 }, // Analytics by action type
    { createdAt: -1 }, // Recent activity
    { relatedId: 1, relatedType: 1 }, // Context lookups
  ],
  
  Achievement: [
    { id: 1 }, // Unique identifier
    { category: 1 }, // Category filtering
    { rarity: 1 }, // Rarity filtering
    { isActive: 1 }, // Active achievements only
  ],
  
  DailyActivity: [
    { userId: 1, date: -1 }, // User activity timeline
    { date: -1 }, // Global activity by date
    { userId: 1, activityLevel: -1 }, // Heatmap data
  ],
  
  Leaderboard: [
    { type: 1, period: 1, category: 1 }, // Specific leaderboard lookup
    { isActive: 1, lastUpdated: -1 }, // Active leaderboards
  ]
};

// Aggregation Pipelines for Complex Queries
export const AggregationPipelines = {
  // Calculate user's rank in different leaderboards
  getUserRankings: (userId: string) => [
    {
      $match: { userId }
    },
    {
      $lookup: {
        from: 'userGamificationProfiles',
        localField: 'userId',
        foreignField: 'userId',
        as: 'allUsers'
      }
    },
    {
      $unwind: '$allUsers'
    },
    {
      $group: {
        _id: null,
        userXP: { $first: '$totalXP' },
        ranks: {
          $push: {
            userId: '$allUsers.userId',
            xp: '$allUsers.totalXP'
          }
        }
      }
    },
    {
      $project: {
        rank: {
          $size: {
            $filter: {
              input: '$ranks',
              cond: { $gt: ['$$this.xp', '$userXP'] }
            }
          }
        }
      }
    }
  ],
  
  // Get weekly activity summary
  getWeeklyActivity: (userId: string, weekStart: Date, weekEnd: Date) => [
    {
      $match: {
        userId,
        createdAt: { $gte: weekStart, $lte: weekEnd }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        totalXP: { $sum: '$xpEarned' },
        sessionCount: {
          $sum: {
            $cond: [{ $eq: ['$actionType', 'session_completed'] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]
};