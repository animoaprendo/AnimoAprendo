// Legacy API route kept for compatibility.
// It now returns a Google service account access token so users do not need to link their own Google accounts.
import { NextRequest, NextResponse } from 'next/server';
import {
  getServiceAccountAccessToken,
  validateServiceAccountConfig,
} from '@/lib/google-service-account';

export async function POST(req: NextRequest) {
  try {
    const validation = validateServiceAccountConfig();

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Service Account is not configured correctly.',
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    const accessToken = await getServiceAccountAccessToken();

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken,
        provider: 'google_service_account',
      },
    });

  } catch (error: any) {
    console.error('Error getting Google service account token:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get service account access token' 
      },
      { status: 500 }
    );
  }
}