import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import setupGamificationDatabase from '@/lib/gamification/setup-database';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin users to run database setup (add your admin check logic here)
    // For now, we'll allow any authenticated user
    
    const result = await setupGamificationDatabase();
    
    if (result.success) {
      return NextResponse.json({ 
        message: 'Database setup completed successfully',
        success: true
      });
    } else {
      return NextResponse.json({ 
        error: 'Database setup failed',
        details: result.error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in database setup API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method to run database setup' 
  }, { status: 405 });
}