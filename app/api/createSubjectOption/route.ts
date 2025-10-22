import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { subjectName, subjectCode, college, department } = body;

    const client = await clientPromise;
    const db = client.db("main");
    const subjectOptions = db.collection("subjectOptions");

    await subjectOptions.insertOne({
      subjectName,
      subjectCode,
      college,
      department,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return new NextResponse(
      JSON.stringify({ message: "Subject option created successfully" }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating subject option:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to create subject option" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
