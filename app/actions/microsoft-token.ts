// Direct Microsoft OAuth token retrieval using server actions
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export interface MicrosoftTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  needsReauth?: boolean;
}

export async function getMicrosoftAccessTokenServerAction(userId?: string): Promise<MicrosoftTokenResult> {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const client = await clerkClient();
    const user = await client.users.getUser(targetUserId);
    
    const microsoftAccounts = user.externalAccounts?.filter(acc => 
      acc.provider === 'oauth_microsoft' && acc.verification?.status === 'verified'
    ) || [];

    if (microsoftAccounts.length === 0) {
      return {
        success: false,
        error: 'No verified Microsoft account found',
        needsReauth: false
      };
    }

    try {
      // Use new Clerk API without 'oauth_' prefix
      const oauthTokens = await client.users.getUserOauthAccessToken(targetUserId, 'microsoft');
      
      console.log('Token retrieval attempt:', {
        hasData: !!oauthTokens?.data,
        dataLength: oauthTokens?.data?.length || 0,
        totalCount: oauthTokens?.totalCount
      });
      
      if (oauthTokens?.data && oauthTokens.data.length > 0 && oauthTokens.data[0].token) {
        console.log('Successfully retrieved access token');
        return {
          success: true,
          accessToken: oauthTokens.data[0].token
        };
      } else {
        console.log('No valid tokens found in response');
        return {
          success: false,
          error: 'OAuth tokens not available or expired',
          needsReauth: true
        };
      }
    } catch (tokenError: any) {
      console.error('Server action token error:', {
        message: tokenError.message,
        code: tokenError.code,
        errors: tokenError.errors
      });
      
      // Check if it's specifically the oauth_token_retrieval_error
      const isTokenRetrievalError = tokenError.errors?.some(
        (err: any) => err.code === 'oauth_token_retrieval_error'
      );
      
      if (isTokenRetrievalError) {
        return {
          success: false,
          error: 'Microsoft OAuth token has expired or insufficient permissions were granted',
          needsReauth: true
        };
      }
      
      return {
        success: false,
        error: `Token retrieval failed: ${tokenError.message}`,
        needsReauth: true
      };
    }

  } catch (error: any) {
    console.error('Server action error:', error);
    return {
      success: false,
      error: `Server error: ${error.message}`
    };
  }
}