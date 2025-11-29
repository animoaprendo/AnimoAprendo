import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

    // Get all users with admin roles
    const adminUsers = await client.users.getUserList({
      limit: 500, // Adjust based on your needs
    });

    // Filter for admin users and format the response
    const admins = adminUsers.data
      .filter(user => {
        const metadata = user.publicMetadata as any;
        return metadata?.isAdmin === true;
      })
      .map(user => {
        const metadata = user.publicMetadata as any;
        return {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || 'No email',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          username: user.username,
          imageUrl: user.imageUrl,
          adminRole: metadata?.adminRole || 'admin',
          college: metadata?.college || '',
          department: metadata?.department || '',
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
        };
      })
      .sort((a, b) => {
        // Sort by admin role (superadmin first) then by creation date
        if (a.adminRole === 'superadmin' && b.adminRole !== 'superadmin') return -1;
        if (a.adminRole !== 'superadmin' && b.adminRole === 'superadmin') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return NextResponse.json({ 
      success: true, 
      admins: admins,
      totalCount: admins.length
    });

  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}