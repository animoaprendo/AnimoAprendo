import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createGamificationService } from '@/lib/gamification/service';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createGamificationService();
    
    // Test getting user profile from gamification database
    const profile = await service.getUserProfile(user.id);
    
    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await service.createUserProfile(user.id);
      return NextResponse.json({ 
        message: 'Created new profile in gamification database',
        profile: newProfile
      });
    }

    return NextResponse.json({ 
      message: 'Profile retrieved from gamification database',
      profile 
    });
    
  } catch (error) {
    console.error('Error in service test:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionType, xpAmount, description } = await request.json();

    const service = createGamificationService();
    
    // Test awarding XP using the service
    const result = await service.awardXP(
      user.id, 
      actionType || 'test_action', 
      xpAmount || 25, 
      description || 'Test XP award'
    );

    return NextResponse.json({ 
      message: 'XP awarded successfully using service',
      result 
    });
    
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json({ 
      error: 'Failed to award XP',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}