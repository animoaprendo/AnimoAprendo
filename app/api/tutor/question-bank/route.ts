import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getTutorQuestionBank, mergeDuplicateQuestionBankEntries } from "@/lib/question-bank";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");
    const subjectOfferingId = searchParams.get("subjectOfferingId");
    const subjectName = searchParams.get("subjectName");
    const limitParam = searchParams.get("limit");
    const includeArchivedParam = searchParams.get("includeArchived");

    if (!tutorId) {
      return NextResponse.json({ success: false, error: "tutorId is required" }, { status: 400 });
    }

    if (tutorId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const parsedLimit = Number(limitParam || 50);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 50;
    const includeArchived = includeArchivedParam === "true";

    const client = await clientPromise;
    const db = client.db("main");

    const entries = await getTutorQuestionBank({
      db,
      tutorId,
      subjectOfferingId,
      subjectName,
      limit,
      includeArchived,
    });

    return NextResponse.json({ success: true, entries }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tutor question bank:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch question bank" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entryId, isFavorite, isArchived } = body as {
      entryId?: string;
      isFavorite?: boolean;
      isArchived?: boolean;
    };

    if (!entryId) {
      return NextResponse.json({ success: false, error: "entryId is required" }, { status: 400 });
    }

    const setPayload: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof isFavorite === "boolean") {
      setPayload.isFavorite = isFavorite;
    }
    if (typeof isArchived === "boolean") {
      setPayload.isArchived = isArchived;
    }

    if (Object.keys(setPayload).length === 1) {
      return NextResponse.json({ success: false, error: "No update fields provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("quizQuestionBank");

    const updated = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(entryId),
        tutorId: userId,
      },
      {
        $set: setPayload,
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry: {
        ...updated,
        _id: (updated as any)._id?.toString?.() || (updated as any)._id,
      },
    });
  } catch (error) {
    console.error("Error updating question bank entry:", error);
    return NextResponse.json({ success: false, error: "Failed to update question bank entry" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, subjectOfferingId, subjectName } = body as {
      action?: string;
      subjectOfferingId?: string;
      subjectName?: string;
    };

    if (action !== "cleanup-duplicates") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");

    const result = await mergeDuplicateQuestionBankEntries({
      db,
      tutorId: userId,
      subjectOfferingId: subjectOfferingId || null,
      subjectName: subjectName || null,
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error("Error running question bank cleanup:", error);
    return NextResponse.json({ success: false, error: "Failed to run question bank cleanup" }, { status: 500 });
  }
}
