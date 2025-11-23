import { Client } from "@microsoft/microsoft-graph-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      startDateTime, 
      endDateTime, 
      subject, 
      isPasscodeRequired = false,
      accessToken,
      attendees = [] // Array of attendee email addresses
    } = body;

    // Validate required fields
    if (!startDateTime || !endDateTime || !subject || !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: startDateTime, endDateTime, subject, accessToken" 
        },
        { status: 400 }
      );
    }

    // Validate attendees format if provided
    if (attendees && !Array.isArray(attendees)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Attendees must be an array of email addresses" 
        },
        { status: 400 }
      );
    }

    // Create Microsoft Graph client with access token
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    // Create the online meeting object with request data
    const onlineMeeting: any = {
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      subject: subject,
      joinMeetingIdSettings: {
        isPasscodeRequired: isPasscodeRequired
      }
    };

    // Add participants if provided
    if (attendees && attendees.length > 0) {
      // For online meetings, we can set participants in the meeting settings
      onlineMeeting.participants = {
        attendees: attendees.map((email: string) => ({
          upn: email, // User Principal Name (email)
          role: "attendee"
        }))
      };
    }

    // Create the meeting using Microsoft Graph API
    const meeting = await client.api('/me/onlineMeetings').post(onlineMeeting);

    return NextResponse.json({ 
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
      }
    });

  } catch (error: any) {
    console.error("Error creating online meeting:", error);
    
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

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create online meeting",
      },
      { status: 500 }
    );
  }
}
