import { NextRequest, NextResponse } from "next/server";
import { Client } from "@microsoft/microsoft-graph-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      meetings, // Array of meeting objects
      accessToken,
      options = {}
    } = body;

    const {
      delayBetweenRequests = 200,
      continueOnError = true
    } = options;

    // Validate required fields
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

    // Create Microsoft Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each meeting
    for (let i = 0; i < meetings.length; i++) {
      const meetingData = meetings[i];
      
      try {
        // Validate individual meeting data
        if (!meetingData.startDateTime || !meetingData.endDateTime || !meetingData.subject) {
          throw new Error("Missing required fields: startDateTime, endDateTime, subject");
        }

        // Create the online meeting object
        const onlineMeeting: any = {
          startDateTime: meetingData.startDateTime,
          endDateTime: meetingData.endDateTime,
          subject: meetingData.subject,
          joinMeetingIdSettings: {
            isPasscodeRequired: meetingData.isPasscodeRequired || false
          }
        };

        // Add participants if provided
        if (meetingData.attendees && meetingData.attendees.length > 0) {
          onlineMeeting.participants = {
            attendees: meetingData.attendees.map((email: string) => ({
              upn: email,
              role: "attendee"
            }))
          };
        }

        // Create the meeting
        const meeting = await client.api('/me/onlineMeetings').post(onlineMeeting);

        results.push({
          index: i,
          success: true,
          meeting: {
            id: meeting.id,
            joinUrl: meeting.joinUrl,
            joinWebUrl: meeting.joinWebUrl,
            subject: meeting.subject,
            startDateTime: meeting.startDateTime,
            endDateTime: meeting.endDateTime,
            participants: meeting.participants,
            organizer: meeting.organizer
          },
          originalData: meetingData
        });
        
        successCount++;
        
        // Add delay between requests to avoid rate limiting (except for last item)
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

        // If not continuing on error, return immediately
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
    console.error("Error in bulk meeting creation:", error);
    
    // Handle specific Microsoft Graph errors
    if (error.code === 'InvalidAuthenticationToken') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token",
        },
        { status: 401 }
      );
    }

    if (error.code === 'Forbidden') {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to create online meetings",
        },
        { status: 403 }
      );
    }

    if (error.code === 'TooManyRequests') {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later or reduce the number of meetings.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create meetings",
      },
      { status: 500 }
    );
  }
}