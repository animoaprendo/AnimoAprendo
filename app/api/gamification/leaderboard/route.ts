import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized",
        data: []
      }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("gamification");
    const collection = db.collection('userGamificationProfiles');

    // Get all gamification profiles, sorted by totalXP descending
    const profiles = await collection
      .find({})
      .sort({ totalXP: -1 })
      .limit(1000) // Reasonable limit for leaderboard
      .toArray();

    return NextResponse.json({
      success: true,
      data: profiles,
      count: profiles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    
    // Return a 200 response with error info instead of 500
    // This allows the client-side fallback logic to work properly
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch leaderboard data",
        details: error instanceof Error ? error.message : "Unknown error",
        data: []
      }, 
      { status: 200 }
    );
  }
}