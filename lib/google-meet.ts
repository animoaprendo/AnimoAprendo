// Jitsi integration helpers kept under the existing module path for compatibility.
import {
  createJitsiJoinUrl,
  createJitsiMeeting,
  createBulkJitsiMeetings,
  generateJitsiRoomName,
  type CreateMeetingRequest,
  type MeetingResponse,
} from './jitsi';

export { createJitsiJoinUrl, createJitsiMeeting, createBulkJitsiMeetings, generateJitsiRoomName };

export async function createGoogleMeetMeeting(meetingData: CreateMeetingRequest): Promise<MeetingResponse> {
  return createJitsiMeeting(meetingData);
}

export async function createGoogleMeetMeetingWithAuth(
  meetingData: Omit<CreateMeetingRequest, 'accessToken'>,
  _userId?: string
): Promise<MeetingResponse> {
  return createJitsiMeeting(meetingData);
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
  const endDate = new Date(appointmentDate.getTime() + durationMinutes * 60 * 1000);
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
  _accessToken: string,
  _options: {
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
  return createBulkJitsiMeetings(meetingsData);
}
