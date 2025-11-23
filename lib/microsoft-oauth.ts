// Microsoft OAuth integration with Clerk
import { useUser } from '@clerk/nextjs';
import { buildApiUrl } from './url-utils';

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Get Microsoft access token from Clerk user's OAuth tokens
 * This requires Microsoft to be configured as an OAuth provider in Clerk Dashboard
 */
export async function getMicrosoftAccessToken(userId?: string): Promise<MicrosoftTokens | null> {
  try {
    const url = buildApiUrl('/api/auth/microsoft/token');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Microsoft OAuth error details:', errorData);
      
      if (errorData.debug) {
        console.log('Debug info:', errorData.debug);
      }
      
      throw new Error(errorData.error || `Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.tokens : null;
  } catch (error) {
    console.error('Error getting Microsoft access token:', error);
    return null;
  }
}

/**
 * Hook to get Microsoft access token for the current user
 */
export function useMicrosoftToken() {
  const { user } = useUser();
  
  const getToken = async (): Promise<MicrosoftTokens | null> => {
    if (!user) return null;
    return getMicrosoftAccessToken(user.id);
  };

  return { getToken };
}

/**
 * Refresh Microsoft access token using refresh token
 */
export async function refreshMicrosoftAccessToken(refreshToken: string): Promise<MicrosoftTokens | null> {
  try {
    const response = await fetch('/api/auth/microsoft/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.tokens : null;
  } catch (error) {
    console.error('Error refreshing Microsoft access token:', error);
    return null;
  }
}