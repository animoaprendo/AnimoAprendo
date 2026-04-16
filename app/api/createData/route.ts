import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { processApprovedSubjectOfferingMilestones } from "@/app/gamification-actions";
import { getDepartmentAutoApprove } from "@/lib/approval-settings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collection, data } = body;

    if (!collection || !data) {
      return NextResponse.json(
        { success: false, error: "Collection and data are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");
    const collectionRef = db.collection(collection);

    let documentToInsert = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (collection === 'subjects' && data?.userId) {
      const userData = await db.collection('users').findOne({ id: data.userId });
      const userCollege = userData?.public_metadata?.collegeInformation?.college || null;
      const userDepartment = userData?.public_metadata?.collegeInformation?.department || null;
      const departmentName = userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? userDepartment : null;

      const shouldAutoApprove =
        userCollege && departmentName
          ? await getDepartmentAutoApprove(db, userCollege, departmentName)
          : false;

      documentToInsert = {
        ...documentToInsert,
        college: userCollege,
        department: userDepartment,
        status: shouldAutoApprove ? 'available' : (data.status || 'pending'),
        autoApproved: shouldAutoApprove,
      };
    }

    const result = await collectionRef.insertOne(documentToInsert);

    if (
      collection === 'subjects' &&
      documentToInsert.status === 'available' &&
      data?.userId
    ) {
      try {
        await processApprovedSubjectOfferingMilestones(
          data.userId,
          result.insertedId.toString()
        );
      } catch (error) {
        console.error('Error updating gamification for subject approval milestone:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...documentToInsert,
      },
    });
  } catch (error) {
    console.error("Error creating data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create data" },
      { status: 500 }
    );
  }
}