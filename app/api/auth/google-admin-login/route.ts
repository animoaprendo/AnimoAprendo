import { NextResponse } from 'next/server';
import { getAdminLoginUrl } from '@/lib/google-admin-oauth';

/**
 * Initiates the Google OAuth flow for admin setup
 * Redirects user to Google's consent screen
 */
export async function GET() {
  try {
    const loginUrl = getAdminLoginUrl();
    console.log('[GoogleAdminSetup] Redirecting to Google OAuth', { loginUrl: loginUrl.substring(0, 80) + '...' });
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[GoogleAdminSetup] Error generating login URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate Google authentication',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
