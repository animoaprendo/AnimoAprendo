import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      email,
      firstName,
      lastName,
      username,
      password,
      adminRole,
      college,
      department,
    } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user to verify they are superadmin
    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
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

    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        {
          error: "Email, first name, last name, and password are required",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    // Validate college requirement for regular admins
    if (adminRole === "admin" && !college) {
      return NextResponse.json(
        {
          error: "Regular admins must have a college assigned",
        },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [email],
      });

      if (existingUsers.data.length > 0) {
        return NextResponse.json(
          {
            error: "A user with this email address already exists",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      // Continue if no existing user found
    }

    // Prepare the metadata
    const publicMetadata: any = {
      isAdmin: true,
      adminRole: adminRole || "admin",
    };

    // Add college/department for regular admins or if specified for superadmins
    if (
      adminRole === "admin" ||
      (adminRole === "superadmin" && (college || department))
    ) {
      if (college) publicMetadata.college = college;
      if (department) {
        publicMetadata.department =
          department === "ALL_DEPARTMENTS" ? "ALL_DEPARTMENTS" : department;
      }
    }

    // Create the new admin user
    const newUser = await client.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      username: username || undefined,
      password,
      publicMetadata,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    });

    return NextResponse.json({
      success: true,
      message: `Admin account created successfully for ${email}`,
      user: {
        id: newUser.id,
        email: newUser.emailAddresses[0]?.emailAddress,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        adminRole: adminRole || "admin",
        college,
        department,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error creating admin account:", error);

    // Handle specific Clerk errors
    if (error?.errors && Array.isArray(error.errors)) {
      const clerkError = error.errors[0];
      if (clerkError?.code === "form_identifier_exists") {
        return NextResponse.json(
          {
            error: "A user with this email address already exists",
          },
          { status: 400 }
        );
      }
      if (clerkError?.code === "form_password_pwned") {
        return NextResponse.json(
          {
            error:
              "This password has been compromised. Please choose a different password.",
          },
          { status: 400 }
        );
      }
      if (clerkError?.code === "form_password_too_common") {
        return NextResponse.json(
          {
            error:
              "This password is too common. Please choose a more secure password.",
          },
          { status: 400 }
        );
      }
      if (clerkError?.code === "form_password_length_too_short") {
        return NextResponse.json(
          {
            error: "Password must be at least 8 characters long.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            clerkError?.longMessage ||
            clerkError?.message ||
            "Failed to create admin account",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create admin account" },
      { status: 500 }
    );
  }
}
