import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { processApprovedSubjectOfferingMilestones } from "@/app/gamification-actions";
import { getDepartmentAutoApprove } from "@/lib/approval-settings";

export async function POST(req: Request) {
  console.log("Saving subject...");
  const sendData = await req.json();
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    const userData = await db
      .collection("users")
      .findOne({ id: sendData.userId });

    const userCollege = userData?.public_metadata?.collegeInformation?.college || null;
    const userDepartment = userData?.public_metadata?.collegeInformation?.department || null;
    const departmentName = userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? userDepartment : null;

    const shouldAutoApprove =
      userCollege && departmentName
        ? await getDepartmentAutoApprove(db, userCollege, departmentName)
        : false;

    // Add timestamps to the subject data
    const subjectWithTimestamps = {
      ...sendData,
      college: userCollege,
      department: userDepartment,
      status: shouldAutoApprove ? 'available' : (sendData.status || 'pending'),
      autoApproved: shouldAutoApprove,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const data = await db.collection("subjects").insertOne(subjectWithTimestamps);

    if (subjectWithTimestamps.status === 'available' && sendData.userId) {
      try {
        await processApprovedSubjectOfferingMilestones(
          sendData.userId,
          data.insertedId.toString()
        );
      } catch (error) {
        console.error("Error updating gamification for subject approval milestone:", error);
      }
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error saving subject:", error);
    return NextResponse.json(
      { error: "Failed to save subject" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  console.log("Updating subject...");
  const sendData = await req.json();
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { documentId, ...rest } = sendData;
    const existingSubject = await db
      .collection("subjects")
      .findOne({ _id: ObjectId.createFromHexString(documentId) });

    let resolvedStatus = rest.status;
    let resolvedAutoApproved = rest.autoApproved;

    // When a tutor submits a draft, status is sent as pending.
    // Resolve it against the department auto-approve setting.
    if (rest.status === 'pending') {
      const effectiveUserId = rest.userId || existingSubject?.userId;

      if (effectiveUserId) {
        const userData = await db.collection("users").findOne({ id: effectiveUserId });
        const userCollege = userData?.public_metadata?.collegeInformation?.college || null;
        const userDepartment = userData?.public_metadata?.collegeInformation?.department || null;
        const departmentName = userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? userDepartment : null;

        const shouldAutoApprove =
          userCollege && departmentName
            ? await getDepartmentAutoApprove(db, userCollege, departmentName)
            : false;

        resolvedStatus = shouldAutoApprove ? 'available' : 'pending';
        resolvedAutoApproved = shouldAutoApprove;
      }
    }
    
    // Add updated timestamp to the update data
    const updateDataWithTimestamp = {
      ...rest,
      ...(resolvedStatus !== undefined ? { status: resolvedStatus } : {}),
      ...(resolvedAutoApproved !== undefined ? { autoApproved: resolvedAutoApproved } : {}),
      updatedAt: new Date().toISOString()
    };
    
    const data = await db
      .collection("subjects")
      .updateOne(
        { _id: ObjectId.createFromHexString(documentId) },
        { $set: updateDataWithTimestamp }
      );

    if (
      resolvedStatus === 'available' &&
      existingSubject?.status !== 'available' &&
      existingSubject?.userId
    ) {
      try {
        await processApprovedSubjectOfferingMilestones(existingSubject.userId, documentId);
      } catch (error) {
        console.error("Error updating gamification for subject approval milestone:", error);
      }
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error updating subject:", error);
    return NextResponse.json(
      { error: "Failed to update subject" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const sendData = await req.json();

  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { documentId, userId } = sendData;

    const data = await db
      .collection("subjects")
      .deleteOne(
        { _id: ObjectId.createFromHexString(documentId), userId: userId },
      );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
