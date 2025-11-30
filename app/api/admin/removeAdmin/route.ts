import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { userId: targetUserId, adminKey, editorId } = await req.json();

    if (!adminKey || adminKey !== process.env.ADMIN_KEY || !editorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user to verify they are superadmin
    const client = await clerkClient();
    const currentUser = await client.users.getUser(editorId);
    const currentUserMetadata = currentUser.publicMetadata as any;

    if (
      !currentUserMetadata?.isAdmin ||
      currentUserMetadata?.adminRole !== "superadmin"
    ) {
      return NextResponse.json(
        { error: "Access denied. Superadmin required." },
        { status: 403 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent removing superadmin status from self
    if (targetUserId === editorId) {
      return NextResponse.json(
        { error: "Cannot remove admin status from yourself" },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await client.users.getUser(targetUserId);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the user from Clerk entirely
    await client.users.deleteUser(targetUserId);

    return NextResponse.json({
      success: true,
      message: `Admin user ${targetUser.emailAddresses[0]?.emailAddress} has been completely deleted`,
      user: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
      },
    });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    return NextResponse.json(
      { error: "Failed to delete admin user" },
      { status: 500 }
    );
  }
}
