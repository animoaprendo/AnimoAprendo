import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeDepartmentName, resolveApprovalScope } from "@/lib/approval-settings";

function assertCanManage(
  scope: ReturnType<typeof resolveApprovalScope>,
  collegeAbbreviation: string,
  departmentName: string
) {
  if (!scope) {
    return false;
  }

  if (scope.role === 'superadmin') {
    return true;
  }

  if (scope.collegeAbbreviation !== collegeAbbreviation) {
    return false;
  }

  if (scope.role === 'department') {
    return scope.departmentName === departmentName;
  }

  return true;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const scope = resolveApprovalScope(currentUser.publicMetadata as any);

    if (!scope) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db('main');
    const allColleges = await db.collection('colleges').find({}).toArray();

    const colleges =
      scope.role === 'superadmin'
        ? allColleges
        : allColleges.filter((college) => college.abbreviation === scope.collegeAbbreviation);

    const settingsQuery =
      scope.role === 'superadmin'
        ? {}
        : { collegeAbbreviation: scope.collegeAbbreviation };

    const rawSettings = await db.collection('approvalSettings').find(settingsQuery).toArray();
    const settings =
      scope.role === 'department'
        ? rawSettings.filter((setting) => setting.departmentName === scope.departmentName)
        : rawSettings;

    return NextResponse.json({
      success: true,
      scope,
      colleges,
      settings,
    });
  } catch (error) {
    console.error('Error loading approval settings:', error);
    return NextResponse.json({ error: 'Failed to load approval settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const scope = resolveApprovalScope(currentUser.publicMetadata as any);

    if (!scope) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const collegeAbbreviation = body.collegeAbbreviation as string | undefined;
    const departmentName = normalizeDepartmentName(body.departmentName as string | null | undefined);
    const autoApprove = Boolean(body.autoApprove);

    if (!collegeAbbreviation || !departmentName) {
      return NextResponse.json(
        { error: 'collegeAbbreviation and departmentName are required' },
        { status: 400 }
      );
    }

    if (!assertCanManage(scope, collegeAbbreviation, departmentName)) {
      return NextResponse.json({ error: 'You can only manage departments in your assigned scope' }, { status: 403 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db('main');
    const college = await db.collection('colleges').findOne({ abbreviation: collegeAbbreviation });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const departmentExists = Array.isArray(college.departments)
      && college.departments.some((department: any) => department.name === departmentName);

    if (!departmentExists) {
      return NextResponse.json({ error: 'Department not found in the selected college' }, { status: 404 });
    }

    const now = new Date();
    const updateResult = await db.collection('approvalSettings').findOneAndUpdate(
      { collegeAbbreviation, departmentName },
      {
        $set: {
          collegeAbbreviation,
          collegeName: college.name,
          departmentName,
          autoApprove,
          updatedAt: now,
          updatedBy: userId,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    const savedSetting = updateResult?.value ?? {
      collegeAbbreviation,
      collegeName: college.name,
      departmentName,
      autoApprove,
      updatedAt: now,
      updatedBy: userId,
    };

    return NextResponse.json({
      success: true,
      setting: savedSetting,
    });
  } catch (error) {
    console.error('Error updating approval setting:', error);
    return NextResponse.json({ error: 'Failed to update approval setting' }, { status: 500 });
  }
}