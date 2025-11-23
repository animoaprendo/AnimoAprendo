// Microsoft Teams integration utilities
import { buildApiUrl } from './url-utils';

export interface CreateMeetingRequest {
  startDateTime: string; // ISO 8601 format
  endDateTime: string;   // ISO 8601 format
  subject: string;
  isPasscodeRequired?: boolean;
  accessToken: string;   // Microsoft Graph access token
  attendees?: string[];  // Array of attendee email addresses
}

export interface MeetingResponse {
  success: boolean;
  meeting?: {
    id: string;
    joinUrl: string;
    joinWebUrl: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    participants?: any;
    organizer?: any;
  };
  error?: string;
}

/**
 * Creates a Microsoft Teams meeting using Microsoft Graph API
 * @param meetingData Meeting details including start/end time and subject
 * @returns Promise with meeting details or error
 */
export async function createTeamsMeeting(meetingData: CreateMeetingRequest): Promise<MeetingResponse> {
  try {
    const url = buildApiUrl('/api/microsoft/createMeeting');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Teams meeting:', error);
    return {
      success: false,
      error: 'Failed to create Teams meeting'
    };
  }
}

/**
 * Creates a Microsoft Teams meeting with automatic token retrieval using Clerk OAuth
 * @param meetingData Meeting details (without accessToken)
 * @param userId User ID to get the access token for
 * @returns Promise with meeting details or error
 */
export async function createTeamsMeetingWithAuth(
  meetingData: Omit<CreateMeetingRequest, 'accessToken'>,
  userId?: string
): Promise<MeetingResponse> {
  try {
    // Try server action approach first (more reliable)
    if (typeof window === 'undefined') {
      // Server-side: import and use server action directly
      const { getMicrosoftAccessTokenServerAction } = await import('@/app/actions/microsoft-token');
      const tokenResult = await getMicrosoftAccessTokenServerAction(userId);
      
      if (tokenResult.success && tokenResult.accessToken) {
        return createTeamsMeeting({
          ...meetingData,
          accessToken: tokenResult.accessToken
        });
      } else {
        return {
          success: false,
          error: tokenResult.error || 'Failed to get Microsoft access token',
        };
      }
    }

    // Client-side: fallback to API route
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
        error: errorData.error || 'Failed to get Microsoft access token. Please reconnect your Microsoft account.'
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.success || !tokenData.tokens?.accessToken) {
      return {
        success: false,
        error: 'No valid Microsoft access token available. Please reconnect your Microsoft account in settings.'
      };
    }

    // Create meeting with the retrieved token
    return createTeamsMeeting({
      ...meetingData,
      accessToken: tokenData.tokens.accessToken
    });

  } catch (error) {
    console.error('Error creating Teams meeting with auth:', error);
    return {
      success: false,
      error: 'Failed to create Teams meeting'
    };
  }
}

/**
 * Formats a date for Microsoft Graph API (ISO 8601 with timezone)
 * @param date Date object
 * @param timezone Optional timezone (defaults to local timezone)
 * @returns Formatted date string
 */
export function formatDateForGraph(date: Date, timezone?: string): string {
  if (timezone) {
    return date.toISOString().replace('Z', timezone);
  }
  // Use local timezone offset
  const offset = date.getTimezoneOffset();
  const sign = offset > 0 ? '-' : '+';
  const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  const timezoneOffset = `${sign}${hours}:${minutes}`;
  
  return date.toISOString().replace('Z', timezoneOffset);
}

/**
 * Creates meeting date/time from appointment data
 * @param appointmentDate Date of the appointment
 * @param durationMinutes Duration in minutes (default 60)
 * @returns Object with formatted start and end times
 */
export function createMeetingTimes(appointmentDate: Date, durationMinutes: number = 60) {
  const startDateTime = formatDateForGraph(appointmentDate);
  const endDate = new Date(appointmentDate.getTime() + (durationMinutes * 60 * 1000));
  const endDateTime = formatDateForGraph(endDate);
  
  return { startDateTime, endDateTime };
}

/**
 * Creates multiple Teams meetings in bulk (for recurring sessions)
 * @param meetingsData Array of meeting data
 * @returns Promise with bulk creation results
 */
export async function createBulkTeamsMeetings(
  meetingsData: Array<{
    startDateTime: string;
    endDateTime: string;
    subject: string;
    attendees?: string[];
    isPasscodeRequired?: boolean;
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
    const response = await fetch('/api/microsoft/createBulkMeetings', {
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating bulk Teams meetings:', error);
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