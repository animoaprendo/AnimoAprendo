// API route to get access token using Google Service Account
// This is used instead of user OAuth tokens for creating Google Meet meetings

import { NextRequest, NextResponse } from 'next/server';
import {
  getServiceAccountAccessToken,
  validateServiceAccountConfig,
} from '@/lib/google-service-account';

export async function POST(req: NextRequest) {
  try {
    // Validate that service account is configured
    const validation = validateServiceAccountConfig();
    if (!validation.isValid) {
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

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken,
        provider: 'google_service_account',
      },
    });
  } catch (error: any) {
    console.error('Error getting service account access token:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get service account access token',
      },
      { status: 500 }
    );
  }
}
