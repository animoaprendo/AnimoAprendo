// Google Service Account authentication utilities
// This allows the app to create Google Meet meetings without requiring users to connect their Google accounts

import { google } from 'googleapis';

/**
 * Get the Google OAuth2 client using service account credentials
 */
export function getServiceAccountAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID;

  if (!email || !privateKey || !projectId) {
    throw new Error(
      'Google Service Account credentials not configured. ' +
      'Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SERVICE_ACCOUNT_PROJECT_ID in .env.local'
    );
  }

  // Replace escaped newlines if they come as strings
  const formattedPrivateKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account' as const,
      project_id: projectId,
      private_key_id: 'service-account',
      private_key: formattedPrivateKey,
      client_email: email,
      client_id: '0',
    } as any,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });

  return auth;
}

/**
 * Get the Google Calendar API client with service account authentication
 */
export async function getCalendarClient() {
  const auth = getServiceAccountAuth();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Get a valid access token from the service account
 */
export async function getServiceAccountAccessToken(): Promise<string> {
  const auth = getServiceAccountAuth();
  const accessToken = await auth.getAccessToken();

  if (!accessToken) {
    throw new Error('Failed to get service account access token');
  }

  return accessToken as string;
}

/**
 * Validate that service account credentials are properly configured
 */
export function validateServiceAccountConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set');
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_PROJECT_ID is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
