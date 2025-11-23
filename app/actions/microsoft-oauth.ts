// Server action to check Microsoft OAuth status directly
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export interface MicrosoftOAuthResult {
  success: boolean;
  hasConnection: boolean;
  error?: string;
  guidance?: string[];
  needsReauth?: boolean;
  debug?: any;
}

export async function checkMicrosoftOAuthServerAction(): Promise<MicrosoftOAuthResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        hasConnection: false,
        error: 'User not authenticated',
        guidance: ['Please sign in to check Microsoft connection status']
      };
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    const microsoftAccounts = user.externalAccounts?.filter(acc => acc.provider === 'oauth_microsoft') || [];
    const verifiedAccounts = microsoftAccounts.filter(acc => acc.verification?.status === 'verified');

    console.log('Server action - Microsoft accounts check:', {
      total: microsoftAccounts.length,
      verified: verifiedAccounts.length
    });

    if (microsoftAccounts.length === 0) {
      return {
        success: true,
        hasConnection: false,
        error: 'No Microsoft account connected',
        guidance: [
          'Connect your Microsoft account in your Clerk profile',
          'This will enable Teams meeting creation for tutoring sessions'
        ]
      };
    }

    if (verifiedAccounts.length === 0) {
      return {
        success: true,
        hasConnection: false,
        error: 'Microsoft account connected but not verified',
        guidance: [
          'Complete the Microsoft account verification process',
          'Check your email for verification instructions from Microsoft'
        ]
      };
    }

    // Try to get OAuth tokens to verify they're working
    // Note: Using new Clerk API without 'oauth_' prefix
    try {
      const oauthTokens = await client.users.getUserOauthAccessToken(userId, 'microsoft');
      
      if (oauthTokens?.data && oauthTokens.data.length > 0 && oauthTokens.data[0].token) {
        console.log('OAuth tokens successfully retrieved');
        return {
          success: true,
          hasConnection: true
        };
      } else {
        console.log('OAuth tokens data structure:', {
          hasData: !!oauthTokens?.data,
          dataLength: oauthTokens?.data?.length || 0,
          totalCount: oauthTokens?.totalCount
        });
        return {
          success: true,
          hasConnection: false,
          error: 'Microsoft account connected but OAuth tokens not available',
          needsReauth: true,
          guidance: [
            'OAuth tokens may have expired or scopes are insufficient',
            'This commonly happens when:',
            '  • The initial OAuth consent did not include required scopes',
            '  • Tokens have expired (typically after 1 hour)',
            '  • The Microsoft app registration is missing permissions',
            '',
            'To fix this:',
            '1. Disconnect your Microsoft account in account settings',
            '2. Reconnect your Microsoft account',
            '3. Ensure these scopes are granted during consent:',
            '  • User.Read (to access basic profile)',
            '  • OnlineMeetings.ReadWrite (to create Teams meetings)',
            '  • offline_access (for token refresh)'
          ]
        };
      }
    } catch (tokenError: any) {
      console.error('Token retrieval error in server action:', {
        message: tokenError.message,
        code: tokenError.code,
        errors: tokenError.errors
      });

      return {
        success: true,
        hasConnection: false,
        error: 'OAuth token retrieval failed - likely expired or insufficient permissions',
        needsReauth: true,
        guidance: [
          'The Microsoft OAuth connection needs to be refreshed',
          'This usually happens when:',
          '  • Tokens have expired',
          '  • Required scopes are missing from the OAuth configuration',
          '  • User needs to re-consent to the application',
          '',
          'To fix this:',
          '1. Go to your account settings',
          '2. Disconnect your Microsoft account',
          '3. Reconnect your Microsoft account',
          '4. Grant all requested permissions'
        ],
        debug: {
          tokenError: tokenError.message,
          accountsFound: microsoftAccounts.length,
          verifiedAccounts: verifiedAccounts.length
        }
      };
    }

  } catch (error: any) {
    console.error('Server action error:', error);
    return {
      success: false,
      hasConnection: false,
      error: `Server error: ${error.message}`,
      guidance: ['This appears to be a server configuration issue', 'Please contact support']
    };
  }
}