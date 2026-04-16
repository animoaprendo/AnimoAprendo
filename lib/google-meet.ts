// Google Meet integration utilities
import { buildApiUrl } from './url-utils';

export interface CreateMeetingRequest {
  startDateTime: string;
  endDateTime: string;
  subject: string;
  accessToken: string;
  timezone?: string;
  description?: string;
  attendees?: string[];
}

export interface MeetingResponse {
  success: boolean;
  meeting?: {
    id: string;
    joinUrl: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    organizerEmail?: string;
  };
  error?: string;
}

export async function createGoogleMeetMeeting(meetingData: CreateMeetingRequest): Promise<MeetingResponse> {
  try {
    const url = buildApiUrl('/api/google/createMeeting');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    });

    return await response.json();
  } catch (error) {
    console.error('Error creating Google Meet meeting:', error);
    return {
      success: false,
      error: 'Failed to create Google Meet meeting'
    };
  }
}

export async function createGoogleMeetMeetingWithAuth(
  meetingData: Omit<CreateMeetingRequest, 'accessToken'>,
  userId?: string
): Promise<MeetingResponse> {
  try {
    if (typeof window === 'undefined') {
      const { getMicrosoftAccessTokenServerAction } = await import('@/app/actions/microsoft-token');
      const tokenResult = await getMicrosoftAccessTokenServerAction(userId);

      if (tokenResult.success && tokenResult.accessToken) {
        return createGoogleMeetMeeting({
          ...meetingData,
          accessToken: tokenResult.accessToken
        });
      }

      return {
        success: false,
        error: tokenResult.error || 'Failed to get Google access token',
      };
    }

    const tokenUrl = buildApiUrl('/api/auth/microsoft/token');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return {
        success: false,
        error: errorData.error || 'Failed to get Google access token. Please reconnect your Google account.'
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.success || !tokenData.tokens?.accessToken) {
      return {
        success: false,
        error: 'No valid Google access token available. Please reconnect your Google account in settings.'
      };
    }

    return createGoogleMeetMeeting({
      ...meetingData,
      accessToken: tokenData.tokens.accessToken
    });
  } catch (error) {
    console.error('Error creating Google Meet meeting with auth:', error);
    return {
      success: false,
      error: 'Failed to create Google Meet meeting'
    };
  }
}

export function formatDateForCalendar(date: Date, timezone?: string): string {
  if (timezone) {
    return date.toISOString().replace('Z', timezone);
  }

  const offset = date.getTimezoneOffset();
  const sign = offset > 0 ? '-' : '+';
  const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  const timezoneOffset = `${sign}${hours}:${minutes}`;

  return date.toISOString().replace('Z', timezoneOffset);
}

export function createMeetingTimes(appointmentDate: Date, durationMinutes: number = 60) {
  const startDateTime = formatDateForCalendar(appointmentDate);
  const endDate = new Date(appointmentDate.getTime() + (durationMinutes * 60 * 1000));
  const endDateTime = formatDateForCalendar(endDate);

  return { startDateTime, endDateTime };
}

export async function createBulkGoogleMeetMeetings(
  meetingsData: Array<{
    startDateTime: string;
    endDateTime: string;
    subject: string;
    attendees?: string[];
    timezone?: string;
    description?: string;
  }>,
  accessToken: string,
  options: {
    delayBetweenRequests?: number;
    continueOnError?: boolean;
  } = {}
): Promise<{
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    meeting?: any;
    error?: string;
    originalData: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  message?: string;
}> {
  try {
    const response = await fetch('/api/google/createBulkMeetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetings: meetingsData,
        accessToken,
        options
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error creating bulk Google Meet meetings:', error);
    return {
      success: false,
      results: [],
      summary: {
        total: meetingsData.length,
        successful: 0,
        failed: meetingsData.length,
        successRate: 0
      },
      message: 'Network error occurred while creating meetings'
    };
  }
}
