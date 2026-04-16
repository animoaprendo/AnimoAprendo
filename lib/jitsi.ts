import { randomUUID } from 'crypto';

export interface CreateMeetingRequest {
  startDateTime: string;
  endDateTime: string;
  subject: string;
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function generateJitsiRoomName(subject: string, startDateTime: string): string {
  const baseSlug = slugify(subject) || 'session';
  const datePart = new Date(startDateTime)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '');
  const suffix = randomUUID().slice(0, 8);

  return `animo-${baseSlug}-${datePart}-${suffix}`.toLowerCase();
}

export function createJitsiJoinUrl(roomName: string): string {
  return `https://meet.jit.si/${roomName}`;
}

export async function createJitsiMeeting(meetingData: CreateMeetingRequest): Promise<MeetingResponse> {
  try {
    if (!meetingData.startDateTime || !meetingData.endDateTime || !meetingData.subject) {
      return {
        success: false,
        error: 'Missing required fields: startDateTime, endDateTime, subject',
      };
    }

    const roomName = generateJitsiRoomName(meetingData.subject, meetingData.startDateTime);
    const joinUrl = createJitsiJoinUrl(roomName);

    return {
      success: true,
      meeting: {
        id: roomName,
        joinUrl,
        subject: meetingData.subject,
        startDateTime: meetingData.startDateTime,
        endDateTime: meetingData.endDateTime,
      },
    };
  } catch (error) {
    console.error('[Jitsi] Failed to create meeting', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Jitsi meeting',
    };
  }
}

export async function createBulkJitsiMeetings(
  meetingsData: Array<CreateMeetingRequest>
): Promise<{
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    meeting?: MeetingResponse['meeting'];
    error?: string;
    originalData: CreateMeetingRequest;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  message?: string;
}> {
  const results = meetingsData.map((meetingData, index) => {
    const created = {
      success: true,
      meeting: {
        id: generateJitsiRoomName(meetingData.subject, meetingData.startDateTime),
        joinUrl: '',
        subject: meetingData.subject,
        startDateTime: meetingData.startDateTime,
        endDateTime: meetingData.endDateTime,
      },
    };

    created.meeting!.joinUrl = createJitsiJoinUrl(created.meeting!.id);

    return {
      index,
      success: true,
      meeting: created.meeting,
      originalData: meetingData,
    };
  });

  const total = meetingsData.length;

  return {
    success: true,
    results,
    summary: {
      total,
      successful: total,
      failed: 0,
      successRate: total === 0 ? 0 : 100,
    },
    message: total === 1 ? '1 Jitsi meeting created successfully' : `${total} Jitsi meetings created successfully`,
  };
}