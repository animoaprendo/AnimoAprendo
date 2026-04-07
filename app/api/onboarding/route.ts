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
    tuteeAvailability,
    tutorAvailability,
  }: any = await req.json();

  try {
    const client = await clerkClient();
    const existingUser = await client.users.getUser(userId);
    const existingVerified =
      (existingUser.publicMetadata as Record<string, unknown> | undefined)
        ?.verified;

    const resolvedRole = role || (accountType === "teacher" ? "tutor" : "tutee");
    const resolvedOnboardingAvailability = Array.isArray(availability)
      ? availability
      : Array.isArray(tuteeAvailability)
        ? tuteeAvailability
        : Array.isArray(tutorAvailability)
          ? tutorAvailability
          : [];

    const publicMetadata: Record<string, unknown> = {
      onboarded: true,
      accountType,
      role: resolvedRole,
      collegeInformation: { college, department, yearLevel, section },
      tuteeAvailability: resolvedOnboardingAvailability,
      tutorAvailability: resolvedOnboardingAvailability,
      availability: resolvedOnboardingAvailability,
    };

    if (accountType === "teacher") {
      publicMetadata.verified =
        typeof existingVerified === "boolean" ? existingVerified : false;
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata,
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
