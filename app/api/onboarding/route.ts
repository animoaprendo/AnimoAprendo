import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("Updating metadata...");

  const {
    userId,
    accountType,
    role,
    college,
    department,
    yearLevel,
    section,
    availability,
  }: any = await req.json();

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboarded: true,
        accountType,
        role,
        collegeInformation: { college, department, yearLevel, section },
        availability,
      },
    });

    return NextResponse.json({ success: true }, {status: 200});
  } catch (error) {
    console.error("Error updating publicMetadata:", error);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  }
}
