// Comprehensive Google OAuth diagnostic tool
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export interface DiagnosticResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  recommendations?: string[];
}

export async function runMicrosoftOAuthDiagnostic(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  
  try {
    // Step 1: Check user authentication
    const { userId } = await auth();
    if (!userId) {
      results.push({
        step: 'User Authentication',
        status: 'error',
        message: 'User not authenticated',
        recommendations: ['User must be signed in to run diagnostics']
      });
      return results;
    }

    results.push({
      step: 'User Authentication',
      status: 'success',
      message: `User authenticated: ${userId}`
    });

    // Step 2: Check Clerk client
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    results.push({
      step: 'Clerk Client',
      status: 'success',
      message: 'Successfully connected to Clerk',
      details: {
        userEmail: user.emailAddresses?.[0]?.emailAddress,
        createdAt: user.createdAt
      }
    });

    // Step 3: Check external accounts
    const externalAccounts = user.externalAccounts || [];
    const microsoftAccounts = externalAccounts.filter(acc => acc.provider === 'oauth_google');
    
    results.push({
      step: 'External Accounts',
      status: microsoftAccounts.length > 0 ? 'success' : 'error',
      message: `Found ${externalAccounts.length} external accounts, ${microsoftAccounts.length} Google accounts`,
      details: {
        allAccounts: externalAccounts.map(acc => ({
          provider: acc.provider,
          verified: acc.verification?.status,
          username: acc.username,
          emailAddress: acc.emailAddress
        })),
        microsoftAccounts: microsoftAccounts.map(acc => ({
          id: acc.id,
          verified: acc.verification?.status,
          username: acc.username,
          emailAddress: acc.emailAddress,
          approvedScopes: acc.approvedScopes,
          publicMetadata: acc.publicMetadata
        }))
      },
      recommendations: microsoftAccounts.length === 0 ? [
        'No Google accounts connected',
        'User needs to add Google as a connected account in Clerk',
        'Go to account settings and connect Google account'
      ] : undefined
    });

    // Step 4: Check account verification
    const verifiedMicrosoftAccounts = microsoftAccounts.filter(acc => acc.verification?.status === 'verified');
    
    results.push({
      step: 'Account Verification',
      status: verifiedMicrosoftAccounts.length > 0 ? 'success' : 'error',
      message: `${verifiedMicrosoftAccounts.length} of ${microsoftAccounts.length} Google accounts are verified`,
      details: {
        verificationStatuses: microsoftAccounts.map(acc => ({
          id: acc.id,
          status: acc.verification?.status,
          strategy: acc.verification?.strategy,
          externalVerificationRedirectURL: acc.verification?.externalVerificationRedirectURL
        }))
      },
      recommendations: verifiedMicrosoftAccounts.length === 0 && microsoftAccounts.length > 0 ? [
        'Google accounts are not verified',
        'Complete the email verification process',
        'Check for verification emails from Google'
      ] : undefined
    });

    // Step 5: Check OAuth token retrieval (new API)
    if (verifiedMicrosoftAccounts.length > 0) {
      try {
        console.log('Attempting OAuth token retrieval with new API...');
        const oauthTokens = await client.users.getUserOauthAccessToken(userId, 'google');
        
        const hasValidTokens = oauthTokens?.data && oauthTokens.data.length > 0 && oauthTokens.data[0].token;
        
        results.push({
          step: 'OAuth Token Retrieval',
          status: hasValidTokens ? 'success' : 'error',
          message: hasValidTokens ? 'Successfully retrieved OAuth access tokens' : 'Failed to retrieve valid OAuth tokens',
          details: {
            totalCount: oauthTokens?.totalCount,
            dataLength: oauthTokens?.data?.length || 0,
            hasToken: hasValidTokens,
            tokenPreview: hasValidTokens ? `${oauthTokens.data[0].token.substring(0, 20)}...` : null,
            provider: oauthTokens?.data?.[0]?.provider,
            scopes: oauthTokens?.data?.[0]?.scopes
          },
          recommendations: !hasValidTokens ? [
            'OAuth tokens are not available or invalid',
            'This typically indicates:',
            '  • Tokens have expired (usually after 1 hour)',
            '  • Required scopes were not granted during initial consent',
            '  • The Google OAuth app lacks necessary permissions',
            '',
            'Recommended actions:',
            '1. Check Google OAuth app scopes in Google Cloud Console',
            '2. Ensure these API permissions are granted:',
            '   • profile',
            '   • email',
            '   • https://www.googleapis.com/auth/calendar.events',
            '3. Verify Clerk OAuth configuration includes these scopes:',
            '   • profile',
            '   • email',
            '   • https://www.googleapis.com/auth/calendar.events',
            '   • offline_access',
            '4. User should disconnect and reconnect Google account',
            '5. During reconnection, ensure all permissions are granted'
          ] : undefined
        });

      } catch (tokenError: any) {
        results.push({
          step: 'OAuth Token Retrieval',
          status: 'error',
          message: `OAuth token retrieval failed: ${tokenError.message}`,
          details: {
            error: tokenError.message,
            code: tokenError.code,
            errors: tokenError.errors,
            clerkTraceId: tokenError.clerkTraceId
          },
          recommendations: [
            'OAuth token retrieval failed with error',
            'Common causes:',
            '  • Insufficient OAuth scopes configured in Clerk',
            '  • Missing OAuth scopes in Google app registration',
            '  • Expired or revoked tokens',
            '  • User needs to re-consent to the application',
            '',
            'Next steps:',
            '1. Verify Clerk Dashboard OAuth configuration',
            '2. Check Google Cloud OAuth consent/app registration',
            '3. Ensure all required permissions are granted and admin-consented',
            '4. Have user disconnect and reconnect Google account'
          ]
        });
      }
    }

    // Step 6: Environment variables check
    const envVars = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    };

    // Step 7: Google App Configuration Check
    try {
      if (process.env.GOOGLE_CLIENT_ID) {
        const appCheckUrl = `https://console.cloud.google.com/apis/credentials?project=${process.env.GOOGLE_PROJECT_ID || ''}`;
        
        results.push({
          step: 'Google App Configuration',
          status: 'warning',
          message: 'Google OAuth app configuration needs manual verification',
          details: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            checkUrl: appCheckUrl
          },
          recommendations: [
            'Manual verification required in Google Cloud Console:',
            '',
            '1. Go to Google Cloud Console → APIs & Services → Credentials',
            `2. Find app with Client ID: ${process.env.GOOGLE_CLIENT_ID}`,
            '3. Check OAuth consent screen scopes:',
            '   • profile',
            '   • email',
            '   • https://www.googleapis.com/auth/calendar.events',
            '4. Check OAuth Client redirect URIs:',
            '   • Verify Clerk redirect URI is configured',
            '5. Verify Google Calendar API is enabled in your project'
          ]
        });
      }
    } catch (appCheckError) {
      // App check is optional, don't fail the entire diagnostic
    }

    const missingEnvVars = Object.entries(envVars).filter(([_, exists]) => !exists).map(([name]) => name);

    results.push({
      step: 'Environment Variables',
      status: missingEnvVars.length === 0 ? 'success' : 'warning',
      message: `${Object.keys(envVars).length - missingEnvVars.length} of ${Object.keys(envVars).length} required environment variables are set`,
      details: envVars,
      recommendations: missingEnvVars.length > 0 ? [
        `Missing environment variables: ${missingEnvVars.join(', ')}`,
        'Ensure all Google and Clerk environment variables are configured'
      ] : undefined
    });

  } catch (error: any) {
    results.push({
      step: 'Diagnostic Error',
      status: 'error',
      message: `Diagnostic failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    });
  }

  return results;
}