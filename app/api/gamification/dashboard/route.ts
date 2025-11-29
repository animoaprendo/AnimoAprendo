import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getXPTransactions,
  getDailyActivity 
} from '@/app/gamification-actions';

// GET /api/gamification/dashboard
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || userId;
    const transactionLimit = parseInt(searchParams.get('transactionLimit') || '10');
    const activityDays = parseInt(searchParams.get('activityDays') || '30');

    // Fetch dashboard data
    const [transactionsResult, activityResult] = await Promise.all([
      getXPTransactions(targetUserId, transactionLimit),
      getDailyActivity(targetUserId, activityDays)
    ]);

    if (!transactionsResult.success || !activityResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch dashboard data' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        recentTransactions: transactionsResult.data,
        dailyActivity: activityResult.data
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}