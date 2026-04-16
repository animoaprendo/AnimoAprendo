import { NextRequest, NextResponse } from "next/server";
import {
  getServiceAccountAccessToken,
  validateServiceAccountConfig,
} from "@/lib/google-service-account";
import {
  getAdminAccessToken,
  validateAdminOAuthConfig,
} from "@/lib/google-admin-oauth";

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

    // Try to get admin OAuth token first (preferred method without admin calendar)
    let resolvedAccessToken: string | null = null;
    let authMethod = 'none';

    const adminValidation = validateAdminOAuthConfig();
    if (adminValidation.isValid) {
      try {
        const refreshToken = process.env.GOOGLE_ADMIN_REFRESH_TOKEN!;
        resolvedAccessToken = await getAdminAccessToken(refreshToken);
        authMethod = 'admin-oauth';
        console.log('[GoogleMeet][createMeeting] Admin OAuth token acquired', {
          traceId,
          tokenType: typeof resolvedAccessToken,
          tokenLength: resolvedAccessToken.length,
        });
      } catch (error) {
        console.warn('[GoogleMeet][createMeeting] Admin OAuth token refresh failed, falling back to service account', {
          traceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fallback to service account if admin OAuth not available
    if (!resolvedAccessToken) {
      const serviceAccountValidation = validateServiceAccountConfig();
      if (!serviceAccountValidation.isValid) {
        const allErrors = [
          ...adminValidation.errors,
          ...serviceAccountValidation.errors,
        ];
        console.error('[GoogleMeet][createMeeting] No valid auth method configured', {
          traceId,
          adminOAuthErrors: adminValidation.errors,
          serviceAccountErrors: serviceAccountValidation.errors,
        });

        return NextResponse.json(
          {
            success: false,
            error: "No Google authentication method is configured.",
            details: allErrors,
          },
          { status: 500 }
        );
      }

      try {
        resolvedAccessToken = await getServiceAccountAccessToken();
        authMethod = 'service-account';
        console.log('[GoogleMeet][createMeeting] Service account token acquired', {
          traceId,
          tokenType: typeof resolvedAccessToken,
          tokenLength: resolvedAccessToken.length,
        });
      } catch (error) {
        console.error('[GoogleMeet][createMeeting] Failed to get service account token', {
          traceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }

    if (typeof resolvedAccessToken !== 'string' || !resolvedAccessToken) {
      throw new Error('Failed to acquire a valid access token');
    }

    const calendarId = process.env.GOOGLE_MEET_CALENDAR_ID || "primary";
    const impersonatedUser = process.env.GOOGLE_WORKSPACE_IMPERSONATED_USER;
    console.log('[GoogleMeet][createMeeting] Calling Google Calendar API', {
      traceId,
      calendarId,
      authMethod,
      conferenceType: 'hangoutsMeet',
      usingWorkspaceImpersonation: !!impersonatedUser,
    });

    const baseEventPayload = {
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
      // Allow guests to join and invite others without organizer approval
      guestCanInviteOthers: true,
      guestCanModify: false,
      guestCanSeeOtherGuests: true,
    };

    const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const eventPayloadWithMeetType = {
      ...baseEventPayload,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
        // Allow unauthenticated users to join the Meet without asking organizer
        entryPointFeatures: ['supportsUnauthenticatedAccess'],
      },
    };

    const eventPayloadWithoutType = {
      ...baseEventPayload,
      conferenceData: {
        createRequest: {
          requestId,
        },
        // Allow unauthenticated users to join the Meet without asking organizer
        entryPointFeatures: ['supportsUnauthenticatedAccess'],
      },
    };

    const createEvent = async (payload: unknown) => {
      return fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedAccessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );
    };

    const extractJoinUrl = (event: any): string => {
      const entryPoints = event?.conferenceData?.entryPoints || [];
      const videoEntry = entryPoints.find((entry: any) => entry.entryPointType === 'video');
      return videoEntry?.uri || event?.hangoutLink || '';
    };

    const fetchEventById = async (eventId: string) => {
      return fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${resolvedAccessToken}`,
          },
        }
      );
    };

    let googleResponse = await createEvent(eventPayloadWithMeetType);

    if (!googleResponse.ok) {
      const initialErrorBody = await googleResponse.text();
      const isInvalidConferenceType =
        googleResponse.status === 400 &&
        initialErrorBody.toLowerCase().includes('invalid conference type value');

      if (isInvalidConferenceType) {
        console.warn('[GoogleMeet][createMeeting] Retrying without explicit conferenceSolutionKey.type', {
          traceId,
          calendarId,
        });

        googleResponse = await createEvent(eventPayloadWithoutType);

        if (!googleResponse.ok) {
          const retryErrorBody = await googleResponse.text();
          console.error('[GoogleMeet][createMeeting] Google Calendar API error after retry', {
            traceId,
            status: googleResponse.status,
            statusText: googleResponse.statusText,
            responseSnippet: retryErrorBody.slice(0, 500),
          });

          return NextResponse.json(
            {
              success: false,
              error: `Failed to create Google Meet event: ${retryErrorBody}`,
              hint:
                'Calendar event creation works, but Meet conference creation is not enabled for this calendar/account. Use a Google Workspace user calendar with Meet enabled, or set GOOGLE_MEET_CALENDAR_ID to a supported calendar.',
            },
            { status: googleResponse.status }
          );
        }
      } else {
        console.error('[GoogleMeet][createMeeting] Google Calendar API error', {
          traceId,
          status: googleResponse.status,
          statusText: googleResponse.statusText,
          responseSnippet: initialErrorBody.slice(0, 500),
        });

        const hint =
          googleResponse.status === 401
            ? authMethod === 'admin-oauth'
              ? 'Admin OAuth token is invalid or revoked. Go to /api/auth/google-admin-login to re-authenticate.'
              : 'Unauthorized token. Verify GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is the full PEM private key and redeploy.'
            : googleResponse.status === 403
              ? 'Token is valid but lacks calendar permissions. Ensure Calendar API is enabled and the service account has calendar access.'
              : undefined;

        return NextResponse.json(
          {
            success: false,
            error: `Failed to create Google Meet event: ${initialErrorBody}`,
            hint,
          },
          { status: googleResponse.status }
        );
      }
    }

    let meeting = await googleResponse.json();
    let joinUrl = extractJoinUrl(meeting);

    // Google sometimes returns conferenceData asynchronously; poll the event briefly.
    if (!joinUrl && meeting?.id) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const eventResponse = await fetchEventById(meeting.id);
        if (!eventResponse.ok) {
          const eventErrorBody = await eventResponse.text();
          console.warn('[GoogleMeet][createMeeting] Failed to fetch event during conference poll', {
            traceId,
            attempt,
            status: eventResponse.status,
            responseSnippet: eventErrorBody.slice(0, 300),
          });
          continue;
        }

        meeting = await eventResponse.json();
        joinUrl = extractJoinUrl(meeting);

        if (joinUrl) {
          console.log('[GoogleMeet][createMeeting] Conference link became available after poll', {
            traceId,
            attempt,
            meetingId: meeting?.id,
          });
          break;
        }
      }
    }

    if (!joinUrl) {
      const isGroupCalendar = calendarId.endsWith('@group.calendar.google.com');
      console.error('[GoogleMeet][createMeeting] Conference generation failed (event created without join URL)', {
        traceId,
        meetingId: meeting?.id,
        organizerEmail: meeting?.organizer?.email,
        calendarId,
        usingWorkspaceImpersonation: !!impersonatedUser,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Calendar event was created but Google Meet link was not generated.',
          hint:
            isGroupCalendar
              ? 'Group calendars often cannot provision Meet links via service account identity. Use a licensed Workspace user calendar ID and configure GOOGLE_WORKSPACE_IMPERSONATED_USER for domain-wide delegation.'
              : 'The calendar/account can create events, but Meet conferencing is not enabled for it. Use a Workspace user calendar with Meet enabled and set GOOGLE_MEET_CALENDAR_ID to that calendar.',
          debug: {
            traceId,
            meetingId: meeting?.id,
            organizerEmail: meeting?.organizer?.email,
            calendarId,
            usingWorkspaceImpersonation: !!impersonatedUser,
          },
        },
        { status: 502 }
      );
    }

    console.log('[GoogleMeet][createMeeting] Meeting created successfully', {
      traceId,
      meetingId: meeting?.id,
      organizerEmail: meeting?.organizer?.email,
      hasJoinUrl: true,
    });

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl,
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
