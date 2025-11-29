import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { updateSessionStats } from "@/app/gamification-actions";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { collection, id, data } = body;

    if (!collection || !id || !data) {
      return NextResponse.json(
        { success: false, error: "Collection, id, and data are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");
    const collectionRef = db.collection(collection);

    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

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

    const result = await collectionRef.updateOne(
      { _id: mongoId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Trigger gamification updates for appointment completions
    if (collection === 'appointments' && data.status === 'completed') {
      try {
        // Get the appointment to find the tutor ID
        const appointment = await collectionRef.findOne({ _id: mongoId });
        if (appointment && appointment.tutorId) {
          await updateSessionStats({
            completed: true,
            appointmentId: id,
            subjectId: appointment.subject,
            durationMinutes: appointment.duration || 60
          }, appointment.tutorId);
        }
      } catch (error) {
        console.error("Error updating gamification for appointment completion:", error);
        // Don't fail the main update if gamification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: mongoId,
        ...updateData,
      },
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update data" },
      { status: 500 }
    );
  }
}