import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user to verify they are superadmin
    const client = await clerkClient();
    const currentUser = await client.users.getUser(currentUserId);
    const currentUserMetadata = currentUser.publicMetadata as any;
    
    if (!currentUserMetadata?.isAdmin || currentUserMetadata?.adminRole !== "superadmin") {
      return NextResponse.json({ error: "Access denied. Superadmin required." }, { status: 403 });
    }

    const { userId: targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Prevent removing superadmin status from self
    if (targetUserId === currentUserId) {
      return NextResponse.json({ error: "Cannot remove admin status from yourself" }, { status: 400 });
    }

    // Get the target user
    const targetUser = await client.users.getUser(targetUserId);
    
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare the metadata update (remove admin fields)
    const publicMetadata: any = {
      ...targetUser.publicMetadata,
    };

    // Remove admin-related fields
    delete publicMetadata.isAdmin;
    delete publicMetadata.adminRole;
    delete publicMetadata.college;
    delete publicMetadata.department;

    // Update user metadata
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata
    });

    return NextResponse.json({ 
      success: true, 
      message: `Admin privileges removed from ${targetUser.emailAddresses[0]?.emailAddress}`,
      user: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
      }
    });

  } catch (error) {
    console.error("Error removing admin:", error);
    return NextResponse.json(
      { error: "Failed to remove admin" },
      { status: 500 }
    );
  }
}