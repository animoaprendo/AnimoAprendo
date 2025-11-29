import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateSessionStats } from '@/app/gamification-actions';

// POST /api/gamification/session-update
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
    const { sessionData, targetUserId } = body;

    // Validate session data
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      );
    }

    // Update session statistics
    const result = await updateSessionStats(
      sessionData,
      targetUserId || userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating session stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}