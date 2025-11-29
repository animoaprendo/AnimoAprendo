import { GamificationSystem } from './system';
import type { 
  UserLevel, 
  Achievement, 
  XPAction, 
  UserStats, 
  GamificationProfile,
  LeaderboardEntry,
  Badge 
} from './types';

// Export all gamification types and system
export { GamificationSystem };
export type { 
  UserLevel, 
  Achievement, 
  XPAction, 
  UserStats, 
  GamificationProfile,
  LeaderboardEntry,
  Badge 
};

// Utility functions for easy integration
export const GamificationUtils = {
  /**
   * Create a simple gamification profile for any user
   */
  createProfile: GamificationSystem.createProfile,
  
  /**
   * Calculate XP from basic stats
   */
  calculateXP: GamificationSystem.calculateTotalXP,
  
  /**
   * Get user level information
   */
  getUserLevel: GamificationSystem.calculateLevel,
  
  /**
   * Check what achievements are available
   */
  checkAchievements: GamificationSystem.checkAchievements,
  
  /**
   * Award XP for specific actions
   */
  awardXP: (currentXP: number, actionId: string): number => {
    const action = GamificationSystem.getXPForAction(actionId);
    return action ? currentXP + action.xp : currentXP;
  },

  /**
   * Helper to create UserStats from basic appointment data
   */
  createStatsFromAppointments: (appointments: any[]): UserStats => {
    const completed = appointments.filter(a => a.status === 'completed').length;
    const upcoming = appointments.filter(a => a.status === 'accepted').length;
    
    return {
      totalAppointments: appointments.length,
      completed,
      upcoming,
      totalReviews: 0,
      averageRating: 0,
      streakDays: 0,
      profileCompleteness: 85,
      responseTime: 1.5,
      cancelationRate: 0
    };
  }
};