import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { collection, id } = body;

    if (!collection || !id) {
      return NextResponse.json(
        { success: false, error: "Collection and id are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");
    const collectionRef = db.collection(collection);

    // Convert id to ObjectId if it's a valid ObjectId string
    let mongoId;
    try {
      mongoId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const result = await collectionRef.deleteOne({ _id: mongoId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete data" },
      { status: 500 }
    );
  }
}