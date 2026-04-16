// Google Service Account authentication utilities
// This allows the app to create Google Meet meetings without requiring users to connect their Google accounts

import { google } from 'googleapis';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

function normalizePrivateKey(privateKey: string) {
  return privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
}

function looksLikePemPrivateKey(privateKey: string) {
  return /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey.trim());
}

function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID;

  if (!email || !privateKey || !projectId) {
    throw new Error(
      'Google Service Account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SERVICE_ACCOUNT_PROJECT_ID.'
    );
  }

  const formattedPrivateKey = normalizePrivateKey(privateKey);

  if (!looksLikePemPrivateKey(formattedPrivateKey)) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must contain a full PEM private key from the service account JSON file. ' +
      'Use the private_key value from Google Cloud JSON credentials, including BEGIN/END PRIVATE KEY lines.'
    );
  }

  return {
    email,
    privateKey: formattedPrivateKey,
    projectId,
  };
}

/**
 * Get the Google OAuth2 client using service account credentials
 */
export function getServiceAccountAuth() {
  const { email, privateKey } = getServiceAccountCredentials();

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: GOOGLE_SCOPES,
  });
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

  // Prefer authorize() for JWT clients because it consistently returns access_token.
  const credentials = await auth.authorize();
  const authorizedToken = credentials?.access_token;

  if (authorizedToken && typeof authorizedToken === 'string') {
    return authorizedToken;
  }

  // Fallback for environments where getAccessToken() may return a string or object.
  const fallbackToken = await auth.getAccessToken();

  if (typeof fallbackToken === 'string' && fallbackToken) {
    return fallbackToken;
  }

  if (fallbackToken && typeof fallbackToken === 'object' && 'token' in fallbackToken) {
    const nestedToken = (fallbackToken as { token?: string | null }).token;
    if (nestedToken) {
      return nestedToken;
    }
  }

  throw new Error('Failed to get a valid string service account access token');
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
  } else if (!looksLikePemPrivateKey(normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY))) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a full PEM private key');
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_PROJECT_ID is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
