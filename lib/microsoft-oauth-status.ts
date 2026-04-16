// Helper function to check Google OAuth configuration status

import { buildApiUrl } from './url-utils';

export interface MicrosoftOAuthStatus {
  isConfigured: boolean;
  hasConnection: boolean;
  error?: string;
  guidance?: string[];
  debug?: any;
}

/**
 * Check the status of Google OAuth integration
 * This helps diagnose common configuration issues.
 */
export async function checkMicrosoftOAuthStatus(userId?: string): Promise<MicrosoftOAuthStatus> {
  try {
    const url = buildApiUrl('/api/auth/microsoft/token');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {
        isConfigured: false,
        hasConnection: false,
        error: 'API endpoint returned HTML instead of JSON. Check server logs.',
        guidance: [
          'API endpoint may be incorrectly configured',
          'Check if the route exists and is properly handling requests',
          'Verify the request is reaching the correct endpoint'
        ]
      };
    }

    const data = await response.json();
    if (data.success) {
      return {
        isConfigured: true,
        hasConnection: true,
      };
    }

    const guidance: string[] = [];
    if (data.debug?.availableAccounts) {
      if (data.debug.availableAccounts.length === 0) {
        guidance.push('No external accounts connected. User needs to connect their Google account.');
      } else {
        guidance.push(`User has these external accounts: ${data.debug.availableAccounts.join(', ')}`);
        if (!data.debug.availableAccounts.includes('google')) {
          guidance.push('Google account not found in external accounts.');
        }
      }
    }

    return {
      isConfigured: false,
      hasConnection: false,
      error: data.error,
      guidance,
      debug: data.debug,
    };
  } catch (error: any) {
    return {
      isConfigured: false,
      hasConnection: false,
      error: error.message,
      guidance: [
        'Network error occurred while checking Google OAuth status',
        'Ensure the API endpoint is accessible'
      ]
    };
  }
}

/**
 * Check Google OAuth status directly using Clerk client (server-side only)
 */
export async function checkMicrosoftOAuthStatusDirect(userId: string): Promise<MicrosoftOAuthStatus> {
  try {
    if (typeof window !== 'undefined') {
      throw new Error('This function can only be called server-side');
    }

    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();

    const user = await client.users.getUser(userId);
    const googleAccounts = user.externalAccounts?.filter(acc => acc.provider === 'oauth_google') || [];
    const verifiedAccounts = googleAccounts.filter(acc => acc.verification?.status === 'verified');

    if (googleAccounts.length === 0) {
      return {
        isConfigured: false,
        hasConnection: false,
        error: 'No Google account connected',
        guidance: ['User needs to connect Google account in Clerk']
      };
    }

    if (verifiedAccounts.length === 0) {
      return {
        isConfigured: true,
        hasConnection: false,
        error: 'Google account connected but not verified',
        guidance: ['User needs to complete Google account verification']
      };
    }

    const oauthTokens = await client.users.getUserOauthAccessToken(userId, 'google');
    if (oauthTokens?.data && oauthTokens.data.length > 0) {
      return {
        isConfigured: true,
        hasConnection: true
      };
    }

    return {
      isConfigured: true,
      hasConnection: false,
      error: 'OAuth tokens not available - likely expired or insufficient scopes',
      guidance: [
        'User needs to reconnect Google account',
        'Ensure required scopes are configured in Clerk:',
        '  - profile',
        '  - email',
        '  - https://www.googleapis.com/auth/calendar.events',
        '  - offline_access'
      ]
    };
  } catch (error: any) {
    return {
      isConfigured: false,
      hasConnection: false,
      error: `Direct check failed: ${error.message}`,
      guidance: ['Check server configuration and Clerk setup']
    };
  }
}

/**
 * Generate Google OAuth app verification checklist
 */
export function getAzureADVerificationChecklist(): string[] {
  return [
    'Google OAuth Verification Checklist:',
    '',
    '1. Navigate to Google Cloud Console:',
    '   • Go to console.cloud.google.com',
    '   • Open APIs & Services → Credentials',
    `   • Find your app (Client ID: ${process.env.GOOGLE_CLIENT_ID || 'Not configured'})`,
    '',
    '2. Verify OAuth Scopes:',
    '   • profile',
    '   • email',
    '   • https://www.googleapis.com/auth/calendar.events',
    '',
    '3. Verify Redirect URIs:',
    '   • Add Clerk callback URL in your OAuth client',
    '   • Ensure each URI exactly matches Clerk configuration',
    '',
    '4. Verify API Enablement:',
    '   • Enable Google Calendar API in your project',
    '',
    '5. Verify Environment Variables:',
    `   • GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing'}`,
    `   • GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing'}`,
    `   • GOOGLE_PROJECT_ID: ${process.env.GOOGLE_PROJECT_ID ? 'Configured' : 'Missing'}`,
  ];
}

/**
 * Generate setup instructions for Google OAuth with Clerk
 */
export function getMicrosoftOAuthSetupInstructions(): string[] {
  return [
    'Google OAuth Setup with Clerk:',
    '',
    '1. Configure in Clerk Dashboard:',
    '   • Go to Configure → SSO Connections',
    '   • Click "Add connection" → Select Google',
    '   • Enter your Google OAuth app details:',
    `     - Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing GOOGLE_CLIENT_ID'}`,
    `     - Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing GOOGLE_CLIENT_SECRET'}`,
    '',
    '2. Required Scopes in Clerk:',
    '   • profile',
    '   • email',
    '   • https://www.googleapis.com/auth/calendar.events',
    '   • offline_access',
    '',
    '3. Google Cloud OAuth Client:',
    '   • Add Clerk redirect URI from Clerk dashboard',
    '   • Confirm consent screen includes required scopes',
    '',
    '4. User Connection:',
    '   • Users must connect their Google account through Clerk',
    '',
    '5. Testing:',
    '   • Use the MicrosoftAccountConnection component',
    '   • Check logs for token retrieval and meeting creation errors',
  ];
}