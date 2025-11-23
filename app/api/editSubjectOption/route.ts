import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const sendData = await req.json();
  try {
    const client = await clientPromise;
    const db = client.db("main");
    const { _id, yearLevel: year, ...rest } = sendData;

    // Add updated timestamp to the update data
    const updateDataWithTimestamp = {
      ...rest,
      year,
      updatedAt: new Date().toISOString(),
    };

    const data = await db
      .collection("subjectOptions")
      .updateOne(
        { _id: ObjectId.createFromHexString(_id) },
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
    const { _id } = sendData;
    const data = await db
      .collection("subjectOptions")
      .deleteOne({ _id: ObjectId.createFromHexString(_id) });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Error deleting subject option:", error);
    return NextResponse.json(
      { error: "Failed to delete subject option" },
      { status: 500 }
    );
  }
}
