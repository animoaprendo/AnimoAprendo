// Alternative Microsoft OAuth token retrieval using Clerk's direct API
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    const { userId } = await req.json();
    
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    
    // Get user details first
    const user = await client.users.getUser(targetUserId);
    
    // Find Microsoft external account
    const microsoftAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_microsoft' && 
                account.verification?.status === 'verified'
    );

    if (!microsoftAccount) {
      return NextResponse.json({
        success: false,
        error: 'No verified Microsoft account found',
        needsConnection: true,
        action: 'connect_microsoft'
      }, { status: 404 });
    }

    // Try to refresh the OAuth connection
    // This endpoint will trigger a re-authentication if needed
    try {
      // Use Clerk's OAuth token refresh mechanism (updated API endpoint)
      const tokenResponse = await fetch(`https://api.clerk.com/v1/users/${targetUserId}/oauth_access_tokens/microsoft`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        
        if (tokenData && tokenData.length > 0) {
          return NextResponse.json({
            success: true,
            tokens: {
              accessToken: tokenData[0].token,
              provider: 'oauth_microsoft',
            }
          });
        }
      } else {
        console.log('Clerk API token response:', tokenResponse.status, await tokenResponse.text());
      }
    } catch (apiError: any) {
      console.error('Clerk API error:', apiError.message);
    }

    // If direct API call fails, the user likely needs to re-authenticate
    return NextResponse.json({
      success: false,
      error: 'OAuth token has expired or needs refresh',
      needsReauth: true,
      action: 'reauth_microsoft',
      guidance: [
        'The Microsoft OAuth token may have expired',
        'User needs to reconnect their Microsoft account',
        'This will refresh the OAuth permissions and token'
      ]
    }, { status: 401 });

  } catch (error: any) {
    console.error('Error in refresh token endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to refresh Microsoft token'
    }, { status: 500 });
  }
}