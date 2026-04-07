import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get("userIds");

    if (!userIds) {
      return NextResponse.json(
        { error: "userIds parameter is required" },
        { status: 400 }
      );
    }

    const userIdArray = userIds
      .split(",")
      .map((id) => (id.startsWith("user_") ? id : `user_${id}`));

    const client = await clerkClient();
    const availabilityData: Record<
      string,
      { tuteeAvailability?: any; tutorAvailability?: any }
    > = {};

    // Fetch each user's availability from Clerk
    for (const userId of userIdArray) {
      try {
        const user = await client.users.getUser(userId);
        const publicMetadata = user.publicMetadata as any;

        availabilityData[userId] = {
          tuteeAvailability: publicMetadata?.tuteeAvailability || [],
          tutorAvailability: publicMetadata?.tutorAvailability || [],
        };
      } catch (error) {
        console.error(`Error fetching availability for user ${userId}:`, error);
        availabilityData[userId] = {
          tuteeAvailability: [],
          tutorAvailability: [],
        };
      }
    }

    return NextResponse.json({ success: true, data: availabilityData });
  } catch (error) {
    console.error("Error fetching user availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch user availability" },
      { status: 500 }
    );
  }
}
