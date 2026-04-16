import { google } from 'googleapis';

/**
 * Google Admin OAuth Config
 * Uses existing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for admin setup
 */

export function getAdminOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getAdminCallbackUrl();

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAdminCallbackUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/google-admin-callback`;
}

/**
 * Generate the OAuth login URL for admin to authenticate
 */
export function getAdminLoginUrl(): string {
  const oauth2Client = getAdminOAuthClient();
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return url;
}

/**
 * Exchange authorization code for refresh token
 */
export async function exchangeCodeForRefreshToken(code: string): Promise<string> {
  const oauth2Client = getAdminOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received from Google. Make sure you see the consent screen.');
    }

    return tokens.refresh_token;
  } catch (error) {
    console.error('[GoogleAdminOAuth] Token exchange failed:', error);
    throw error;
  }
}

/**
 * Get a fresh access token using the stored refresh token
 */
export async function getAdminAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = getAdminOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const accessToken = credentials.access_token;

    if (!accessToken) {
      throw new Error('Failed to get access token from refresh token');
    }

    return accessToken;
  } catch (error) {
    console.error('[GoogleAdminOAuth] Refresh failed:', error);
    throw error;
  }
}

/**
 * Validate that admin refresh token is configured
 */
export function validateAdminOAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is not set');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET is not set');
  }
  if (!process.env.GOOGLE_ADMIN_REFRESH_TOKEN) {
    errors.push('GOOGLE_ADMIN_REFRESH_TOKEN is not set. Run the admin login setup.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
