import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("Saving subject...");
  const sendData = await req.json();
  try {
    const client = await clientPromise;
    const db = client.db("main");
    
    // Add timestamps to the subject data
    const subjectWithTimestamps = {
      ...sendData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const data = await db.collection("subjects").insertOne(subjectWithTimestamps);

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
