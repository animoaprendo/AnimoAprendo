import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      startDateTime,
      endDateTime,
      subject,
      accessToken,
      attendees = [],
      timezone = 'UTC',
      description = ''
    } = body;

    if (!startDateTime || !endDateTime || !subject || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: startDateTime, endDateTime, subject, accessToken"
        },
        { status: 400 }
      );
    }

    if (attendees && !Array.isArray(attendees)) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendees must be an array of email addresses"
        },
        { status: 400 }
      );
    }

    const eventPayload = {
      summary: subject,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: timezone,
      },
      attendees: attendees.map((email: string) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const googleResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create Google Meet event: ${errorBody}`,
        },
        { status: googleResponse.status }
      );
    }

    const meeting = await googleResponse.json();
    const entryPoints = meeting?.conferenceData?.entryPoints || [];
    const videoEntry = entryPoints.find((entry: any) => entry.entryPointType === 'video');

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: videoEntry?.uri || meeting.hangoutLink || '',
        subject: meeting.summary,
        startDateTime: meeting.start?.dateTime,
        endDateTime: meeting.end?.dateTime,
        organizerEmail: meeting.organizer?.email,
      }
    });
  } catch (error: any) {
    console.error("Error creating Google Meet event:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Google Meet event",
      },
      { status: 500 }
    );
  }
}
