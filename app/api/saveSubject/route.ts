import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { processApprovedSubjectOfferingMilestones } from "@/app/gamification-actions";

export async function POST(req: Request) {
  console.log("Saving subject...");
  const sendData = await req.json();
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    const userData = await db
      .collection("users")
      .findOne({ id: sendData.userId });

    // Add timestamps to the subject data
    const subjectWithTimestamps = {
      ...sendData,
      college: userData?.public_metadata.collegeInformation.college || null,
      department: userData?.public_metadata.collegeInformation.department || null,
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
    
    // Add updated timestamp to the update data
    const updateDataWithTimestamp = {
      ...rest,
      updatedAt: new Date().toISOString()
    };
    
    const data = await db
      .collection("subjects")
      .updateOne(
        { _id: ObjectId.createFromHexString(documentId) },
        { $set: updateDataWithTimestamp }
      );

    if (
      rest.status === 'available' &&
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
