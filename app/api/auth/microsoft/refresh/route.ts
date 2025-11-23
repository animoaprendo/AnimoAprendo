// API route to refresh Microsoft access token
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Refresh the Microsoft access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/User.Read',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Microsoft token refresh error:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to refresh token' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      }
    });

  } catch (error: any) {
    console.error('Error refreshing Microsoft access token:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to refresh access token' 
      },
      { status: 500 }
    );
  }
}