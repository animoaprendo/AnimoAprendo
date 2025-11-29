import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

    const { userId: targetUserId, adminRole, college, department } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get the target user
    const targetUser = await client.users.getUser(targetUserId);
    
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare the metadata update
    const publicMetadata: any = {
      ...targetUser.publicMetadata,
      isAdmin: true,
      adminRole: adminRole || 'admin',
    };

    // Only add college/department for regular admins
    if (adminRole === 'admin') {
      if (college) publicMetadata.college = college;
      if (department) publicMetadata.department = department;
    }

    // Update user metadata
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata
    });

    return NextResponse.json({ 
      success: true, 
      message: `User ${targetUser.emailAddresses[0]?.emailAddress} has been made an admin`,
      user: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        adminRole: adminRole || 'admin',
        college,
        department
      }
    });

  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    );
  }
}