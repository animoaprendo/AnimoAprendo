import { 
  UserLevel, 
  Achievement, 
  XPAction, 
  UserStats, 
  GamificationProfile,
  LeaderboardEntry 
} from './types';

export class GamificationSystem {
  // XP Actions Configuration
  private static readonly XP_ACTIONS: Record<string, XPAction> = {
    'session_completed': {
      action: 'session_completed',
      xp: 25,
      description: 'Complete a tutoring session',
      category: 'session'
    },
    'session_perfect_rating': {
      action: 'session_perfect_rating',
      xp: 15,
      description: 'Receive a 5-star review',
      category: 'quality'
    },
    'profile_updated': {
      action: 'profile_updated',
      xp: 5,
      description: 'Update your profile',
      category: 'engagement'
    },
    'first_session': {
      action: 'first_session',
      xp: 50,
      description: 'Complete your first tutoring session',
      category: 'milestone'
    },
    'streak_7_days': {
      action: 'streak_7_days',
      xp: 30,
      description: 'Maintain a 7-day activity streak',
      category: 'milestone'
    },
    'quick_response': {
      action: 'quick_response',
      xp: 10,
      description: 'Respond to inquiry within 1 hour',
      category: 'engagement'
    },
    'subject_mastery': {
      action: 'subject_mastery',
      xp: 100,
      description: 'Complete 20 sessions in a subject',
      category: 'milestone'
    },
    'helpful_review': {
      action: 'helpful_review',
      xp: 20,
      description: 'Receive a detailed positive review',
      category: 'quality'
    }
  };

  // Level Titles and Requirements
  private static readonly LEVEL_TITLES = [
    { level: 1, title: 'New Tutor', description: 'Just getting started', color: '#6B7280', icon: '🌱' },
    { level: 2, title: 'Learning Guide', description: 'Building confidence', color: '#10B981', icon: '📚' },
    { level: 3, title: 'Knowledge Sharer', description: 'Helping others grow', color: '#3B82F6', icon: '🎓' },
    { level: 4, title: 'Skilled Educator', description: 'Proven expertise', color: '#8B5CF6', icon: '🏆' },
    { level: 5, title: 'Expert Teacher', description: 'Master of craft', color: '#F59E0B', icon: '⭐' },
    { level: 6, title: 'Master Educator', description: 'Elite performance', color: '#EF4444', icon: '🎯' },
    { level: 7, title: 'Teaching Legend', description: 'Legendary status', color: '#F97316', icon: '👑' }
  ];

  /**
   * Calculate user level based on total XP
   */
  static calculateLevel(totalXP: number): UserLevel {
    // XP required for each level (exponential growth)
    const getXPForLevel = (level: number): number => {
      if (level <= 1) return 0;
      return Math.floor(100 * Math.pow(1.5, level - 2));
    };

    let currentLevel = 1;
    let currentLevelXP = 0;

    // Find current level
    while (currentLevel < this.LEVEL_TITLES.length) {
      const nextLevelXP = getXPForLevel(currentLevel + 1);
      if (totalXP < nextLevelXP) break;
      currentLevel++;
    }

    // Calculate progress within current level
    const currentLevelStartXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForLevel(currentLevel + 1);
    const currentXP = totalXP - currentLevelStartXP;
    const xpToNextLevel = nextLevelXP - totalXP;

    // Get level info
    const levelInfo = this.LEVEL_TITLES[currentLevel - 1] || this.LEVEL_TITLES[this.LEVEL_TITLES.length - 1];

    return {
      level: currentLevel,
      currentXP,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      totalXP,
      title: levelInfo.title,
      description: levelInfo.description,
      color: levelInfo.color,
      icon: levelInfo.icon
    };
  }

  /**
   * Get XP value for a specific action
   */
  static getXPForAction(actionId: string): XPAction | null {
    return this.XP_ACTIONS[actionId] || null;
  }

  /**
   * Get all available XP actions
   */
  static getAllXPActions(): XPAction[] {
    return Object.values(this.XP_ACTIONS);
  }

  /**
   * Calculate total XP from user stats
   */
  static calculateTotalXP(stats: UserStats): number {
    let totalXP = 0;

    // Base XP from completed sessions
    totalXP += stats.completed * 25;

    // Bonus XP for quality metrics
    if (stats.averageRating && stats.averageRating >= 4.5) {
      totalXP += Math.floor(stats.completed * 0.5 * 15); // 50% of sessions with perfect ratings
    }

    // Milestone bonuses
    if (stats.completed >= 1) totalXP += 50; // First session bonus
    if (stats.completed >= 10) totalXP += 100; // 10 sessions bonus
    if (stats.completed >= 50) totalXP += 200; // 50 sessions bonus
    if (stats.completed >= 100) totalXP += 500; // 100 sessions bonus

    // Streak bonuses
    if (stats.streakDays && stats.streakDays >= 7) {
      totalXP += Math.floor(stats.streakDays / 7) * 30;
    }

    // Profile completeness bonus
    if (stats.profileCompleteness && stats.profileCompleteness >= 80) {
      totalXP += 25;
    }

    return Math.max(0, totalXP);
  }

  /**
   * Generate achievements based on user stats
   */
  static checkAchievements(stats: UserStats): Achievement[] {
    const achievements: Achievement[] = [
      // Session Milestones
      {
        id: "first_session",
        name: "First Steps",
        description: "Complete your first tutoring session",
        icon: "🌟",
        rarity: "common",
        category: "sessions",
        unlocked: stats.completed >= 1,
        xpReward: 50,
      },
      {
        id: "ten_sessions",
        name: "Getting Started",
        description: "Complete 10 tutoring sessions",
        icon: "🎯",
        rarity: "common",
        category: "sessions",
        unlocked: stats.completed >= 10,
        progress: stats.completed,
        maxProgress: 10,
        xpReward: 100,
      },
      {
        id: "fifty_sessions",
        name: "Dedicated Tutor",
        description: "Complete 50 tutoring sessions",
        icon: "🏆",
        rarity: "rare",
        category: "sessions",
        unlocked: stats.completed >= 50,
        progress: stats.completed,
        maxProgress: 50,
        xpReward: 200,
      },
      {
        id: "hundred_sessions",
        name: "Century Club",
        description: "Complete 100 tutoring sessions",
        icon: "💯",
        rarity: "epic",
        category: "sessions",
        unlocked: stats.completed >= 100,
        progress: stats.completed,
        maxProgress: 100,
        xpReward: 500,
      },

      // Quality Achievements
      {
        id: "five_star_rating",
        name: "Excellence",
        description: "Maintain a 4.5+ star rating",
        icon: "⭐",
        rarity: "rare",
        category: "reviews",
        unlocked:
          (stats.averageRating || 0) >= 4.5 && (stats.totalReviews || 0) >= 5,
        xpReward: 150,
      },
      {
        id: "perfect_rating",
        name: "Perfection",
        description: "Maintain a perfect 5.0 star rating with 10+ reviews",
        icon: "🌟",
        rarity: "legendary",
        category: "reviews",
        unlocked:
          (stats.averageRating || 0) === 5.0 && (stats.totalReviews || 0) >= 10,
        xpReward: 300,
      },

      // Streak Achievements
      {
        id: "week_streak",
        name: "Consistent",
        description: "Maintain a 7-day activity streak",
        icon: "🔥",
        rarity: "common",
        category: "streak",
        unlocked: (stats.streakDays || 0) >= 7,
        progress: stats.streakDays || 0,
        maxProgress: 7,
        xpReward: 75,
      },
      {
        id: "month_streak",
        name: "Dedicated",
        description: "Maintain a 30-day activity streak",
        icon: "🚀",
        rarity: "epic",
        category: "streak",
        unlocked: (stats.streakDays || 0) >= 30,
        progress: stats.streakDays || 0,
        maxProgress: 30,
        xpReward: 250,
      },

      // Special Achievements
      //   {
      //     id: 'profile_complete',
      //     name: 'Well Prepared',
      //     description: 'Complete your profile 100%',
      //     icon: '📋',
      //     rarity: 'common',
      //     category: 'milestone',
      //     unlocked: (stats.profileCompleteness || 0) >= 100,
      //     xpReward: 50
      //   },
      {
        id: "quick_responder",
        name: "Lightning Fast",
        description: "Maintain average response time under 2 hours",
        icon: "⚡",
        rarity: "rare",
        category: "milestone",
        unlocked: (stats.responseTime || 999) <= 180, // in minutes
        xpReward: 100,
      },
    ];

    // Set unlocked date for unlocked achievements
    return achievements.map(achievement => ({
      ...achievement,
      unlockedAt: achievement.unlocked ? new Date() : undefined
    }));
  }

  /**
   * Create a complete gamification profile
   */
  static createProfile(userId: string, stats: UserStats): GamificationProfile {
    const totalXP = this.calculateTotalXP(stats);
    const level = this.calculateLevel(totalXP);
    const achievements = this.checkAchievements(stats);

    return {
      userId,
      totalXP,
      level,
      achievements,
      lastActivity: new Date(),
      streak: {
        current: stats.streakDays || 0,
        longest: stats.streakDays || 0,
        lastDate: new Date()
      },
      stats
    };
  }

  /**
   * Get next achievement suggestions
   */
  static getNextAchievements(achievements: Achievement[]): Achievement[] {
    return achievements
      .filter(a => !a.unlocked && a.maxProgress)
      .sort((a, b) => {
        const aProgress = (a.progress || 0) / (a.maxProgress || 1);
        const bProgress = (b.progress || 0) / (b.maxProgress || 1);
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }

  /**
   * Calculate progress percentage for level
   */
  static getLevelProgress(level: UserLevel): number {
    const totalXPForLevel = level.currentXP + level.xpToNextLevel;
    return totalXPForLevel > 0 ? (level.currentXP / totalXPForLevel) * 100 : 0;
  }
}