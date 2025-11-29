import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { awardXP } from '@/app/gamification-actions';

// POST /api/gamification/award-xp
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      actionType, 
      xpAmount, 
      description, 
      relatedId, 
      relatedType,
      targetUserId 
    } = body;

    // Validate required fields
    if (!actionType || !xpAmount || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Award XP
    const result = await awardXP(
      actionType,
      xpAmount,
      description,
      relatedId,
      relatedType,
      targetUserId || userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}