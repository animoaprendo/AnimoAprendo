// Helper function to check Microsoft OAuth configuration status

import { buildApiUrl } from './url-utils';

export interface MicrosoftOAuthStatus {
  isConfigured: boolean;
  hasConnection: boolean;
  error?: string;
  guidance?: string[];
  debug?: any;
}

/**
 * Check the status of Microsoft OAuth integration
 * This helps diagnose common configuration issues
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

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('API returned non-JSON response:', contentType);
      const textResponse = await response.text();
      console.error('Response text:', textResponse.substring(0, 200));
      
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

    // Analyze the error to provide guidance
    const guidance: string[] = [];
    
    if (data.debug?.availableAccounts) {
      if (data.debug.availableAccounts.length === 0) {
        guidance.push('No external accounts connected. User needs to connect their Microsoft account.');
      } else {
        guidance.push(`User has these external accounts: ${data.debug.availableAccounts.join(', ')}`);
        if (!data.debug.availableAccounts.includes('microsoft') && !data.debug.availableAccounts.includes('azure')) {
          guidance.push('Microsoft account not found in external accounts.');
        }
      }
    }

    if (data.error?.includes('Please ensure Microsoft is connected')) {
      guidance.push('1. Go to Clerk Dashboard → Configure → SSO Connections');
      guidance.push('2. Add Microsoft as an OAuth provider');
      guidance.push('3. Configure with your Microsoft App Registration credentials');
      guidance.push('4. Ensure scopes include: User.Read, OnlineMeetings.ReadWrite');
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
        'Network error occurred while checking Microsoft OAuth status',
        'Ensure the API endpoint is accessible'
      ]
    };
  }
}

/**
 * Check Microsoft OAuth status directly using Clerk client (server-side only)
 */
export async function checkMicrosoftOAuthStatusDirect(userId: string): Promise<MicrosoftOAuthStatus> {
  try {
    // This function should only be called from server-side code
    if (typeof window !== 'undefined') {
      throw new Error('This function can only be called server-side');
    }

    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    
    const user = await client.users.getUser(userId);
    const microsoftAccounts = user.externalAccounts?.filter(acc => acc.provider === 'oauth_microsoft') || [];
    const verifiedAccounts = microsoftAccounts.filter(acc => acc.verification?.status === 'verified');

    if (microsoftAccounts.length === 0) {
      return {
        isConfigured: false,
        hasConnection: false,
        error: 'No Microsoft account connected',
        guidance: ['User needs to connect Microsoft account in Clerk']
      };
    }

    if (verifiedAccounts.length === 0) {
      return {
        isConfigured: true,
        hasConnection: false,
        error: 'Microsoft account connected but not verified',
        guidance: ['User needs to complete Microsoft account verification']
      };
    }

    // Try to get OAuth tokens directly
    try {
      const oauthTokens = await client.users.getUserOauthAccessToken(userId, 'oauth_microsoft');
      
      if (oauthTokens?.data && oauthTokens.data.length > 0) {
        return {
          isConfigured: true,
          hasConnection: true
        };
      } else {
        return {
          isConfigured: true,
          hasConnection: false,
          error: 'OAuth tokens not available - likely expired or insufficient scopes',
          guidance: [
            'User needs to reconnect Microsoft account',
            'Ensure required scopes are configured in Clerk:',
            '  - https://graph.microsoft.com/User.Read',
            '  - https://graph.microsoft.com/OnlineMeetings.ReadWrite',
            '  - offline_access'
          ]
        };
      }
    } catch (tokenError: any) {
      return {
        isConfigured: true,
        hasConnection: false,
        error: `OAuth token retrieval failed: ${tokenError.message}`,
        guidance: [
          'This is likely a scope or permission issue',
          'User should disconnect and reconnect Microsoft account',
          'Verify Clerk OAuth configuration includes required scopes'
        ]
      };
    }

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
 * Generate Azure AD app registration verification checklist
 */
export function getAzureADVerificationChecklist(): string[] {
  return [
    '🔍 Azure AD App Registration Verification Checklist:',
    '',
    '1. Navigate to Azure Portal:',
    '   • Go to portal.azure.com',
    '   • Navigate to Azure Active Directory',
    '   • Go to App Registrations',
    `   • Find your app (Client ID: ${process.env.MICROSOFT_CLIENT_ID || 'Not configured'})`,
    '',
    '2. Verify API Permissions:',
    '   • Click on "API permissions" tab',
    '   • Should see these permissions:',
    '     ✓ Microsoft Graph → User.Read (Delegated)',
    '     ✓ Microsoft Graph → OnlineMeetings.ReadWrite (Delegated)', 
    '   • Check "Admin consent required" column',
    '   • Status should show "Granted for [your organization]"',
    '   • If not granted, click "Grant admin consent for [org]"',
    '',
    '3. Verify Authentication Settings:',
    '   • Click on "Authentication" tab',
    '   • Platform configurations should include Web',
    '   • Redirect URIs should include Clerk\'s callback URL',
    '   • Under "Implicit grant and hybrid flows":',
    '     ✓ Access tokens should be checked',
    '     ✓ ID tokens should be checked',
    '',
    '4. Check Certificates & Secrets:',
    '   • Verify client secret is not expired',
    '   • Client secret should match MICROSOFT_CLIENT_SECRET env var',
    '',
    '5. Verify Overview Information:',
    `   • Application (client) ID: ${process.env.MICROSOFT_CLIENT_ID || 'Not configured'}`,
    `   • Directory (tenant) ID: ${process.env.MICROSOFT_CLIENT_TENANT_ID || 'Not configured'}`,
    '   • Supported account types should allow the target users'
  ];
}

/**
 * Generate setup instructions for Microsoft OAuth with Clerk
 */
export function getMicrosoftOAuthSetupInstructions(): string[] {
  return [
    '📋 Microsoft OAuth Setup with Clerk:',
    '',
    '1. Configure in Clerk Dashboard:',
    '   • Go to Configure → SSO Connections',
    '   • Click "Add connection" → Select Microsoft',
    '   • Enter your Microsoft App Registration details:',
    `     - Client ID: ${process.env.MICROSOFT_CLIENT_ID ? '✅ Configured' : '❌ Missing MICROSOFT_CLIENT_ID'}`,
    `     - Client Secret: ${process.env.MICROSOFT_CLIENT_SECRET ? '✅ Configured' : '❌ Missing MICROSOFT_CLIENT_SECRET'}`,
    `     - Tenant ID: ${process.env.MICROSOFT_CLIENT_TENANT_ID ? '✅ Configured' : '❌ Missing MICROSOFT_CLIENT_TENANT_ID'}`,
    '',
    '2. Required Scopes in Clerk:',
    '   • https://graph.microsoft.com/User.Read',
    '   • https://graph.microsoft.com/OnlineMeetings.ReadWrite',
    '   • offline_access (for refresh tokens)',
    '',
    '3. Azure AD App Registration:',
    '   • Add Clerk\'s redirect URI (found in Clerk dashboard)',
    '   • Grant required API permissions',
    '   • Enable "Access tokens" and "ID tokens"',
    '',
    '4. User Connection:',
    '   • Users must connect their Microsoft account through Clerk',
    '   • This can be done in account settings or during sign-up',
    '',
    '5. Testing:',
    '   • Use the MicrosoftAccountConnection component',
    '   • Check console logs for debugging information',
    '   • Verify tokens are retrieved successfully',
  ];
}