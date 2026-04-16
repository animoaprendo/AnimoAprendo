import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      meetings,
      accessToken,
      options = {}
    } = body;

    const {
      delayBetweenRequests = 200,
      continueOnError = true
    } = options;

    if (!meetings || !Array.isArray(meetings) || meetings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "meetings array is required and cannot be empty"
        },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "accessToken is required"
        },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < meetings.length; i++) {
      const meetingData = meetings[i];

      try {
        if (!meetingData.startDateTime || !meetingData.endDateTime || !meetingData.subject) {
          throw new Error("Missing required fields: startDateTime, endDateTime, subject");
        }

        const eventPayload = {
          summary: meetingData.subject,
          description: meetingData.description || '',
          start: {
            dateTime: meetingData.startDateTime,
            timeZone: meetingData.timezone || 'UTC',
          },
          end: {
            dateTime: meetingData.endDateTime,
            timeZone: meetingData.timezone || 'UTC',
          },
          attendees: (meetingData.attendees || []).map((email: string) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 10)}`,
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
          throw new Error(await googleResponse.text());
        }

        const meeting = await googleResponse.json();
        const entryPoints = meeting?.conferenceData?.entryPoints || [];
        const videoEntry = entryPoints.find((entry: any) => entry.entryPointType === 'video');

        results.push({
          index: i,
          success: true,
          meeting: {
            id: meeting.id,
            joinUrl: videoEntry?.uri || meeting.hangoutLink || '',
            subject: meeting.summary,
            startDateTime: meeting.start?.dateTime,
            endDateTime: meeting.end?.dateTime,
            organizerEmail: meeting.organizer?.email,
          },
          originalData: meetingData
        });

        successCount++;

        if (i < meetings.length - 1 && delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error occurred';

        results.push({
          index: i,
          success: false,
          error: errorMessage,
          originalData: meetingData
        });

        failureCount++;

        if (!continueOnError) {
          return NextResponse.json({
            success: false,
            error: `Failed at meeting ${i + 1}: ${errorMessage}`,
            partialResults: results,
            summary: {
              total: results.length,
              successful: successCount,
              failed: failureCount
            }
          }, { status: 500 });
        }

        console.error(`Failed to create meeting ${i + 1}:`, error);
      }
    }

    const overallSuccess = failureCount === 0;
    const successRate = (successCount / meetings.length) * 100;

    return NextResponse.json({
      success: overallSuccess,
      results,
      summary: {
        total: meetings.length,
        successful: successCount,
        failed: failureCount,
        successRate: Math.round(successRate * 100) / 100
      },
      message: overallSuccess
        ? `All ${meetings.length} meetings created successfully`
        : `${successCount} of ${meetings.length} meetings created successfully`
    });
  } catch (error: any) {
    console.error("Error in bulk Google Meet creation:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Google Meet meetings",
      },
      { status: 500 }
    );
  }
}
