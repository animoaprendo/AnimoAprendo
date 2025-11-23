import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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

    // Add timestamps
    const documentToInsert = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collectionRef.insertOne(documentToInsert);

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