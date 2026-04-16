// API route to get access token using Google Service Account
// This is used instead of user OAuth tokens for creating Google Meet meetings

import { NextRequest, NextResponse } from 'next/server';
import {
  getServiceAccountAccessToken,
  validateServiceAccountConfig,
} from '@/lib/google-service-account';

export async function POST(req: NextRequest) {
  const traceId = `svc-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    console.log('[GoogleMeet][serviceAccountToken] Request received', { traceId });

    // Validate that service account is configured
    const validation = validateServiceAccountConfig();
    if (!validation.isValid) {
      console.error('[GoogleMeet][serviceAccountToken] Invalid service account config', {
        traceId,
        validationErrors: validation.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Google Service Account is not properly configured',
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    // Get access token from service account
    const accessToken = await getServiceAccountAccessToken();
    console.log('[GoogleMeet][serviceAccountToken] Token acquired', {
      traceId,
      tokenLength: accessToken.length,
    });

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken,
        provider: 'google_service_account',
      },
    });
  } catch (error: any) {
    console.error('[GoogleMeet][serviceAccountToken] Unhandled error', {
      traceId,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get service account access token',
      },
      { status: 500 }
    );
  }
}
