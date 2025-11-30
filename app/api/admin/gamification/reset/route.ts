import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resetType, userColleges, userDepartments, adminKey, editorId } = body;

    // Validate admin key from request body
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Invalid admin key" }, { status: 401 });
    }

    if (!editorId) {
      return NextResponse.json(
        { error: "Editor ID is required" },
        { status: 400 }
      );
    }

    // Get current user to verify they are admin (superadmin or regular admin)
    const clerkClientInstance = await clerkClient();
    const currentUser = await clerkClientInstance.users.getUser(editorId);
    const currentUserMetadata = currentUser.publicMetadata as any;

    if (!currentUserMetadata?.isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    // Check if user is superadmin for 'all' reset type
    if (resetType === 'all' && currentUserMetadata?.adminRole !== "superadmin") {
      return NextResponse.json(
        { error: "Access denied. Superadmin required for full reset." },
        { status: 403 }
      );
    }

    if (!['all', 'filtered'].includes(resetType)) {
      return NextResponse.json({ error: "Invalid reset type" }, { status: 400 });
    }

    // For filtered resets, ensure colleges/departments are provided
    if (resetType === 'filtered' && (!userColleges || userColleges.length === 0)) {
      return NextResponse.json({ error: "Colleges must be specified for filtered reset" }, { status: 400 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("gamification");

    // Build filter based on reset type
    let filter = {};
    let resetCount = 0;
    
    if (resetType === 'filtered') {
      // Use the existing API to get user data from the main database
      
      const usersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/getData?collection=users`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!usersResponse.ok) {
        return NextResponse.json({ 
          success: false, 
          error: "Failed to fetch user data",
          editorId 
        });
      }

      const usersResult = await usersResponse.json();
      const allUsers = usersResult.data || [];
      
      // Filter users based on college and department
      const matchingUsers = allUsers.filter((user: any) => {
        // Skip admin users
        if (user.publicMetadata?.isAdmin === true || user.public_metadata?.isAdmin === true) {
          return false;
        }
        
        // Check college match
        let collegeMatch = false;
        if (userColleges && userColleges.length > 0) {
          const userCollege = user.publicMetadata?.college || 
                              user.publicMetadata?.collegeInformation?.college ||
                              user.public_metadata?.college || 
                              user.public_metadata?.collegeInformation?.college;
          collegeMatch = userColleges.includes(userCollege);
        } else {
          collegeMatch = true;
        }
        
        // Check department match
        let departmentMatch = false;
        if (userDepartments && userDepartments.length > 0 && !userDepartments.includes('ALL_DEPARTMENTS')) {
          const userDepartment = user.publicMetadata?.department || 
                                 user.publicMetadata?.collegeInformation?.department ||
                                 user.public_metadata?.department || 
                                 user.public_metadata?.collegeInformation?.department;
          departmentMatch = userDepartments.includes(userDepartment);
        } else {
          departmentMatch = true;
        }
        
        return collegeMatch && departmentMatch;
      });
      
      const userIds = matchingUsers.map((user: any) => user.id);
      
      if (userIds.length === 0) {
        return NextResponse.json({ 
          success: true, 
          message: "No users found matching the filter criteria",
          resetCount: 0,
          editorId 
        });
      }
      
      filter = { userId: { $in: userIds } };
    }
    
    // Reset user gamification profiles (all or filtered)
    const profileCollection = db.collection('userGamificationProfiles');
    
    // Delete gamification profiles
    const deleteResult = await profileCollection.deleteMany(filter);
    resetCount = deleteResult.deletedCount;

    // Clear related gamification data
    const transactionCollection = db.collection('xpTransactions');
    await transactionCollection.deleteMany(resetType === 'filtered' ? filter : {});

    const dailyActivityCollection = db.collection('dailyActivities');
    await dailyActivityCollection.deleteMany(resetType === 'filtered' ? filter : {});

    const userBadgeCollection = db.collection('userBadges');
    await userBadgeCollection.deleteMany(resetType === 'filtered' ? filter : {});

    // Update leaderboards to reflect reset
    const leaderboardCollection = db.collection('leaderboards');
    await leaderboardCollection.updateMany(
      {},
      {
        $set: {
          entries: [],
          lastUpdated: new Date(),
          isActive: true
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: resetType === 'all' 
        ? `Successfully reset all ${resetCount} gamification profiles`
        : `Successfully reset ${resetCount} gamification profiles for specified users`,
      resetCount,
      resetType,
      editorId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error resetting gamification profiles:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to reset gamification profiles",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}