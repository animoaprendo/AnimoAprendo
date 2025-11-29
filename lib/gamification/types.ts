export interface UserLevel {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  title: string;
  description: string;
  color: string;
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'sessions' | 'reviews' | 'streak' | 'milestone' | 'special';
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  xpReward: number;
}

export interface XPAction {
  action: string;
  xp: number;
  description: string;
  category: 'session' | 'engagement' | 'quality' | 'milestone' | 'bonus';
}

export interface UserStats {
  totalAppointments: number;
  completed: number;
  upcoming: number;
  totalReviews?: number;
  averageRating?: number;
  streakDays?: number;
  profileCompleteness?: number;
  responseTime?: number;
  cancelationRate?: number;
}

export interface GamificationProfile {
  userId: string;
  totalXP: number;
  level: UserLevel;
  achievements: Achievement[];
  lastActivity: Date;
  streak: {
    current: number;
    longest: number;
    lastDate: Date;
  };
  stats: UserStats;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  totalXP: number;
  level: number;
  rank: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  earned: boolean;
}