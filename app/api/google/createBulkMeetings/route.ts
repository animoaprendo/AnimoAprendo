import { NextRequest, NextResponse } from "next/server";
import { createBulkJitsiMeetings } from "@/lib/jitsi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      meetings,
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

    const result = await createBulkJitsiMeetings(meetings);

    return NextResponse.json({
      ...result,
      summary: {
        ...result.summary,
        total: meetings.length,
        successful: meetings.length,
        failed: 0,
        successRate: 100,
      },
      message: meetings.length === 1
        ? '1 Jitsi meeting created successfully'
        : `${meetings.length} Jitsi meetings created successfully`,
    });
  } catch (error: any) {
    console.error("Error in bulk Jitsi creation:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Jitsi meetings",
      },
      { status: 500 }
    );
  }
}
