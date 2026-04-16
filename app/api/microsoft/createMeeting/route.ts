import { NextRequest, NextResponse } from "next/server";
import { createJitsiMeeting } from "@/lib/jitsi";

export async function POST(req: NextRequest) {
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

    // Validate required fields
    if (!startDateTime || !endDateTime || !subject) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: startDateTime, endDateTime, subject" 
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

    const meeting = await createJitsiMeeting({
      startDateTime,
      endDateTime,
      subject,
      timezone,
      description,
      attendees,
    });

    return NextResponse.json(meeting);

  } catch (error: any) {
    console.error("Error creating Jitsi meeting:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Jitsi meeting",
      },
      { status: 500 }
    );
  }
}
