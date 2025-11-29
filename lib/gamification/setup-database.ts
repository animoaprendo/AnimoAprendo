// Database Setup Script for Gamification System
// Run this script to create the necessary collections and indexes

import clientPromise from '@/lib/mongodb';

export async function setupGamificationDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db("gamification");

    console.log('Setting up gamification database...');

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const existingCollectionNames = collections.map(c => c.name);

    const requiredCollections = [
      'userGamificationProfiles',
      'xpTransactions',
      'achievements',
      'dailyActivities',
      'leaderboards',
      'badges',
      'userBadges'
    ];

    for (const collectionName of requiredCollections) {
      if (!existingCollectionNames.includes(collectionName)) {
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      }
    }

    // Create indexes for optimal performance
    console.log('Creating indexes...');

    // UserGamificationProfile indexes
    const profileCollection = db.collection('userGamificationProfiles');
    await profileCollection.createIndex({ userId: 1 }, { unique: true });
    await profileCollection.createIndex({ totalXP: -1 });
    await profileCollection.createIndex({ currentLevel: -1 });
    await profileCollection.createIndex({ "stats.completedSessions": -1 });
    await profileCollection.createIndex({ lastActivityDate: -1 });
    console.log('✓ UserGamificationProfile indexes created');

    // XPTransaction indexes
    const transactionCollection = db.collection('xpTransactions');
    await transactionCollection.createIndex({ userId: 1, createdAt: -1 });
    await transactionCollection.createIndex({ actionType: 1 });
    await transactionCollection.createIndex({ createdAt: -1 });
    await transactionCollection.createIndex({ relatedId: 1, relatedType: 1 });
    console.log('✓ XPTransaction indexes created');

    // Achievement indexes
    const achievementCollection = db.collection('achievements');
    await achievementCollection.createIndex({ id: 1 }, { unique: true });
    await achievementCollection.createIndex({ category: 1 });
    await achievementCollection.createIndex({ rarity: 1 });
    await achievementCollection.createIndex({ isActive: 1 });
    console.log('✓ Achievement indexes created');

    // DailyActivity indexes
    const activityCollection = db.collection('dailyActivities');
    await activityCollection.createIndex({ userId: 1, date: -1 }, { unique: true });
    await activityCollection.createIndex({ date: -1 });
    await activityCollection.createIndex({ userId: 1, activityLevel: -1 });
    console.log('✓ DailyActivity indexes created');

    // Leaderboard indexes
    const leaderboardCollection = db.collection('leaderboards');
    await leaderboardCollection.createIndex({ type: 1, period: 1, category: 1 }, { unique: true });
    await leaderboardCollection.createIndex({ isActive: 1, lastUpdated: -1 });
    console.log('✓ Leaderboard indexes created');

    // Badge indexes
    const badgeCollection = db.collection('badges');
    await badgeCollection.createIndex({ id: 1 }, { unique: true });
    await badgeCollection.createIndex({ isActive: 1 });
    console.log('✓ Badge indexes created');

    // UserBadge indexes
    const userBadgeCollection = db.collection('userBadges');
    await userBadgeCollection.createIndex({ userId: 1, badgeId: 1 }, { unique: true });
    await userBadgeCollection.createIndex({ userId: 1, isDisplayed: 1 });
    console.log('✓ UserBadge indexes created');

    // Insert default achievements
    console.log('Inserting default achievements...');
    await insertDefaultAchievements(achievementCollection);

    console.log('✅ Gamification database setup complete!');
    return { success: true };

  } catch (error) {
    console.error('Error setting up gamification database:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function insertDefaultAchievements(collection: any) {
  const defaultAchievements = [
    {
      id: 'first_session',
      name: 'First Steps',
      description: 'Complete your first tutoring session',
      icon: '🌟',
      category: 'sessions',
      rarity: 'common',
      xpReward: 50,
      requirements: [
        {
          type: 'session_count',
          value: 1,
          comparison: 'gte'
        }
      ],
      isProgressBased: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'ten_sessions',
      name: 'Getting Started',
      description: 'Complete 10 tutoring sessions',
      icon: '🎯',
      category: 'sessions',
      rarity: 'common',
      xpReward: 100,
      requirements: [
        {
          type: 'session_count',
          value: 10,
          comparison: 'gte'
        }
      ],
      isProgressBased: true,
      maxProgress: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'fifty_sessions',
      name: 'Dedicated Tutor',
      description: 'Complete 50 tutoring sessions',
      icon: '🏆',
      category: 'sessions',
      rarity: 'rare',
      xpReward: 200,
      requirements: [
        {
          type: 'session_count',
          value: 50,
          comparison: 'gte'
        }
      ],
      isProgressBased: true,
      maxProgress: 50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'hundred_sessions',
      name: 'Century Club',
      description: 'Complete 100 tutoring sessions',
      icon: '💯',
      category: 'sessions',
      rarity: 'epic',
      xpReward: 500,
      requirements: [
        {
          type: 'session_count',
          value: 100,
          comparison: 'gte'
        }
      ],
      isProgressBased: true,
      maxProgress: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'five_star_rating',
      name: 'Excellence',
      description: 'Maintain a 4.5+ star rating with 5+ reviews',
      icon: '⭐',
      category: 'reviews',
      rarity: 'rare',
      xpReward: 150,
      requirements: [
        {
          type: 'rating_average',
          value: 4.5,
          comparison: 'gte'
        }
      ],
      isProgressBased: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'perfect_rating',
      name: 'Perfection',
      description: 'Maintain a perfect 5.0 star rating with 10+ reviews',
      icon: '🌟',
      category: 'reviews',
      rarity: 'legendary',
      xpReward: 300,
      requirements: [
        {
          type: 'rating_average',
          value: 5.0,
          comparison: 'eq'
        }
      ],
      isProgressBased: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'week_streak',
      name: 'Consistent',
      description: 'Maintain a 7-day activity streak',
      icon: '🔥',
      category: 'streak',
      rarity: 'common',
      xpReward: 75,
      requirements: [
        {
          type: 'streak_days',
          value: 7,
          comparison: 'gte'
        }
      ],
      isProgressBased: true,
      maxProgress: 7,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'month_streak',
      name: 'Dedicated',
      description: 'Maintain a 30-day activity streak',
      icon: '🚀',
      category: 'streak',
      rarity: 'epic',
      xpReward: 250,
      requirements: [
        {
          type: 'streak_days',
          value: 30,
          comparison: 'gte'
        }
      ],
      isProgressBased: true,
      maxProgress: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'profile_complete',
      name: 'Well Prepared',
      description: 'Complete your profile 100%',
      icon: '📋',
      category: 'milestone',
      rarity: 'common',
      xpReward: 50,
      requirements: [
        {
          type: 'profile_completeness',
          value: 100,
          comparison: 'gte'
        }
      ],
      isProgressBased: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    },
    {
      id: 'quick_responder',
      name: 'Lightning Fast',
      description: 'Maintain average response time under 2 hours',
      icon: '⚡',
      category: 'milestone',
      rarity: 'rare',
      xpReward: 100,
      requirements: [
        {
          type: 'response_time',
          value: 2,
          comparison: 'lte'
        }
      ],
      isProgressBased: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    }
  ];

  // Insert achievements if they don't already exist
  for (const achievement of defaultAchievements) {
    const existing = await collection.findOne({ id: achievement.id });
    if (!existing) {
      await collection.insertOne(achievement);
      console.log(`✓ Inserted achievement: ${achievement.name}`);
    }
  }
}

// Export the setup function for use in API routes or scripts
export default setupGamificationDatabase;