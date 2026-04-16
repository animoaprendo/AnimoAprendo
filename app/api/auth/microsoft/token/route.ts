// API route to get Google access token from Clerk OAuth tokens
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    const { userId } = await req.json();
    
    // Use the provided userId or the authenticated user's ID
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    // Get OAuth access tokens from Clerk for Google
    const client = await clerkClient();
    
    try {
      // First, let's check what OAuth connections the user has
      const user = await client.users.getUser(targetUserId);

      // Try the standard Google OAuth provider
      let oauthTokens = null;
      let usedProvider = 'oauth_google';
      let tokenError = null;

      try {
        // First check if user has external accounts
        const microsoftAccounts = user.externalAccounts?.filter(acc => acc.provider === 'oauth_google');
        
        if (!microsoftAccounts || microsoftAccounts.length === 0) {
          throw new Error('No Google external accounts found');
        }

        // Check if accounts are verified
        const verifiedAccounts = microsoftAccounts.filter(acc => acc.verification?.status === 'verified');
        
        if (verifiedAccounts.length === 0) {
          throw new Error('Google accounts are not verified');
        }

        // Try to get the OAuth access token (using new API without oauth_ prefix)
        oauthTokens = await client.users.getUserOauthAccessToken(targetUserId, 'google');
        
      } catch (providerError: any) {
        tokenError = providerError;
        console.error(`Provider oauth_google failed:`, {
          message: providerError?.message,
          status: providerError?.status,
          code: providerError?.code,
          errors: providerError?.errors
        });
      }
      
      if (!oauthTokens || !oauthTokens.data || oauthTokens.data.length === 0) {
        let errorMessage = 'No Google OAuth access token available.';
        let guidance = [];
        
        const microsoftAccounts = user.externalAccounts?.filter(acc => acc.provider === 'oauth_google') || [];
        
        if (microsoftAccounts.length === 0) {
          errorMessage = 'No Google account connected to Clerk.';
          guidance = [
            'Go to your account settings in Clerk',
            'Connect your Google account',
            'Ensure proper scopes are granted'
          ];
        } else {
          const verifiedAccounts = microsoftAccounts.filter(acc => acc.verification?.status === 'verified');
          if (verifiedAccounts.length === 0) {
            errorMessage = 'Google account is connected but not verified.';
            guidance = [
              'Complete the Google account verification process',
              'Check your email for verification instructions'
            ];
          } else {
            errorMessage = 'Google account is connected and verified, but OAuth token retrieval failed.';
            guidance = [
              'This may be a scope or permission issue',
              'Check Clerk OAuth configuration for required scopes:',
              '  - profile',
              '  - email',
              '  - https://www.googleapis.com/auth/calendar.events',
              '  - offline_access',
              'The user may need to re-consent to the application'
            ];
          }
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage,
            guidance,
            debug: {
              availableAccounts: user.externalAccounts?.map(acc => acc.provider) || [],
              microsoftAccountsCount: microsoftAccounts.length,
              verifiedAccountsCount: microsoftAccounts.filter(acc => acc.verification?.status === 'verified').length,
              tokenError: tokenError?.message,
              triedProvider: 'oauth_google'
            }
          },
          { status: 404 }
        );
      }

      const tokenData = oauthTokens.data[0];

      return NextResponse.json({
        success: true,
        tokens: {
          accessToken: tokenData.token,
          provider: usedProvider,
        }
      });
    } catch (clerkError: any) {
      console.error('Clerk OAuth error:', clerkError);
      
      // Try the refresh token endpoint as a fallback
      try {
        console.log('Trying refresh token endpoint as fallback...');
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const refreshResponse = await fetch(`${baseUrl}/api/auth/microsoft/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: targetUserId }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            console.log('Refresh token endpoint succeeded');
            return NextResponse.json(refreshData);
          }
        }
      } catch (refreshError) {
        console.log('Refresh token endpoint also failed:', refreshError);
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve OAuth token from Clerk. The token may have expired.',
          needsReauth: true,
          guidance: [
            'The Google OAuth connection may have expired',
            'User should disconnect and reconnect their Google account in Clerk',
            'This will refresh the OAuth permissions and generate new tokens'
          ],
          debug: {
            clerkError: clerkError.message,
            userId: targetUserId
          }
        },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error('Error getting Google access token:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get access token' 
      },
      { status: 500 }
    );
  }
}