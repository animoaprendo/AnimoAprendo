import { NextRequest, NextResponse } from "next/server";
import {
  getServiceAccountAccessToken,
  validateServiceAccountConfig,
} from "@/lib/google-service-account";

export async function POST(req: NextRequest) {
  const traceId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    console.log('[GoogleMeet][createMeeting] Request received', {
      traceId,
      hasStartDateTime: !!startDateTime,
      hasEndDateTime: !!endDateTime,
      hasSubject: !!subject,
      attendeesCount: Array.isArray(attendees) ? attendees.length : -1,
      timezone,
      hasDescription: !!description,
    });

    if (!startDateTime || !endDateTime || !subject) {
      console.warn('[GoogleMeet][createMeeting] Validation failed: missing fields', {
        traceId,
        hasStartDateTime: !!startDateTime,
        hasEndDateTime: !!endDateTime,
        hasSubject: !!subject,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: startDateTime, endDateTime, subject"
        },
        { status: 400 }
      );
    }

    if (attendees && !Array.isArray(attendees)) {
      console.warn('[GoogleMeet][createMeeting] Validation failed: attendees is not an array', {
        traceId,
        attendeesType: typeof attendees,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Attendees must be an array of email addresses"
        },
        { status: 400 }
      );
    }

    // Always mint a fresh service-account token server-side.
    // This avoids client-supplied stale OAuth tokens causing 401 responses.
    const validation = validateServiceAccountConfig();
    if (!validation.isValid) {
      console.error('[GoogleMeet][createMeeting] Service account config invalid', {
        traceId,
        validationErrors: validation.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Google Service Account is not configured.",
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    const resolvedAccessToken = await getServiceAccountAccessToken();
    if (typeof resolvedAccessToken !== 'string' || !resolvedAccessToken) {
      throw new Error('Service account token is not a valid string');
    }

    console.log('[GoogleMeet][createMeeting] Service account token acquired', {
      traceId,
      tokenType: typeof resolvedAccessToken,
      tokenLength: resolvedAccessToken.length,
    });

    const calendarId = process.env.GOOGLE_MEET_CALENDAR_ID || "primary";
    console.log('[GoogleMeet][createMeeting] Calling Google Calendar API', {
      traceId,
      calendarId,
      conferenceType: 'hangoutsMeet',
    });

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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedAccessToken}`,
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      console.error('[GoogleMeet][createMeeting] Google Calendar API error', {
        traceId,
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        responseSnippet: errorBody.slice(0, 500),
      });

      const hint =
        googleResponse.status === 401
          ? 'Unauthorized token. Verify GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is the full PEM private key and redeploy.'
          : googleResponse.status === 403
            ? 'Token is valid but lacks calendar permissions. Ensure Calendar API is enabled and the service account has calendar access.'
            : undefined;

      return NextResponse.json(
        {
          success: false,
          error: `Failed to create Google Meet event: ${errorBody}`,
          hint,
        },
        { status: googleResponse.status }
      );
    }

    const meeting = await googleResponse.json();
    const entryPoints = meeting?.conferenceData?.entryPoints || [];
    const videoEntry = entryPoints.find((entry: any) => entry.entryPointType === 'video');

    console.log('[GoogleMeet][createMeeting] Meeting created successfully', {
      traceId,
      meetingId: meeting?.id,
      organizerEmail: meeting?.organizer?.email,
      hasJoinUrl: !!(videoEntry?.uri || meeting?.hangoutLink),
    });

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
    console.error('[GoogleMeet][createMeeting] Unhandled error', {
      traceId,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Google Meet event",
      },
      { status: 500 }
    );
  }
}
