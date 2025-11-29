import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
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
    };

    // Update admin role if provided
    if (adminRole) {
      publicMetadata.adminRole = adminRole;
    }

    // Update college/department for regular admins
    if (adminRole === 'admin' || (targetUser.publicMetadata as any)?.adminRole === 'admin') {
      if (college !== undefined) publicMetadata.college = college;
      if (department !== undefined) publicMetadata.department = department;
    }

    // If upgrading to superadmin, remove college/department restrictions
    if (adminRole === 'superadmin') {
      delete publicMetadata.college;
      delete publicMetadata.department;
    }

    // Update user metadata
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata
    });

    return NextResponse.json({ 
      success: true, 
      message: `Admin ${targetUser.emailAddresses[0]?.emailAddress} has been updated`,
      user: {
        id: targetUser.id,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        adminRole: publicMetadata.adminRole,
        college: publicMetadata.college,
        department: publicMetadata.department
      }
    });

  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "Failed to update admin" },
      { status: 500 }
    );
  }
}