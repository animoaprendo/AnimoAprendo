import { NextRequest, NextResponse } from "next/server";
import { createJitsiMeeting } from "@/lib/jitsi";

export async function POST(req: NextRequest) {
  const traceId = `jitsi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const body = await req.json();
    const {
      startDateTime,
      endDateTime,
      subject,
      attendees = [],
      timezone = 'UTC',
      description = ''
    } = body;

    console.log('[Jitsi][createMeeting] Request received', {
      traceId,
      hasStartDateTime: !!startDateTime,
      hasEndDateTime: !!endDateTime,
      hasSubject: !!subject,
      attendeesCount: Array.isArray(attendees) ? attendees.length : -1,
      timezone,
      hasDescription: !!description,
    });

    if (!startDateTime || !endDateTime || !subject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: startDateTime, endDateTime, subject',
        },
        { status: 400 }
      );
    }

    if (attendees && !Array.isArray(attendees)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendees must be an array of email addresses',
        },
        { status: 400 }
      );
    }

    const meeting = await createJitsiMeeting({
      startDateTime,
      endDateTime,
      subject,
      timezone,
      description,
      attendees,
    });

    if (!meeting.success || !meeting.meeting) {
      return NextResponse.json(meeting, { status: 500 });
    }

    console.log('[Jitsi][createMeeting] Meeting created successfully', {
      traceId,
      meetingId: meeting.meeting.id,
      joinUrl: meeting.meeting.joinUrl,
    });

    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('[Jitsi][createMeeting] Unhandled error', {
      traceId,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create Jitsi meeting',
      },
      { status: 500 }
    );
  }
}
