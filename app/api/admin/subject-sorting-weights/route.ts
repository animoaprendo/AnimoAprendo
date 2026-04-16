import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  getWeightsTotal,
  hasValidWeightsTotal,
  sanitizeSortingWeights,
} from "@/lib/subject-sorting-settings";
import { DEFAULT_WEIGHTS, type SortingWeights } from "@/lib/subject-sorting";

const COLLECTION_NAME = "subjectSortingSettings";
const SETTINGS_KEY = "global";

function isSuperAdmin(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  return metadata.isAdmin === true && metadata.adminRole === "superadmin";
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (!isSuperAdmin((user.publicMetadata || {}) as Record<string, unknown>)) {
      return NextResponse.json({ error: "Only superadmins can manage sorting weights" }, { status: 403 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("main");
    const doc = await db.collection(COLLECTION_NAME).findOne({ key: SETTINGS_KEY });

    if (!doc?.weights || typeof doc.weights !== "object") {
      return NextResponse.json({
        success: true,
        source: "default",
        weights: DEFAULT_WEIGHTS,
      });
    }

    const weights = sanitizeSortingWeights(doc.weights as Partial<Record<keyof SortingWeights, unknown>>);
    if (!hasValidWeightsTotal(weights)) {
      return NextResponse.json({
        success: true,
        source: "default",
        weights: DEFAULT_WEIGHTS,
      });
    }

    return NextResponse.json({
      success: true,
      source: "database",
      weights,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
    });
  } catch (error) {
    console.error("Error loading subject sorting weights:", error);
    return NextResponse.json({ error: "Failed to load sorting weights" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (!isSuperAdmin((user.publicMetadata || {}) as Record<string, unknown>)) {
      return NextResponse.json({ error: "Only superadmins can manage sorting weights" }, { status: 403 });
    }

    const body = await req.json();
    const weights = sanitizeSortingWeights(body?.weights as Partial<Record<keyof SortingWeights, unknown>>);

    if (!hasValidWeightsTotal(weights)) {
      return NextResponse.json(
        { error: `Total weight must equal 100. Current total: ${getWeightsTotal(weights)}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const dbClient = await clientPromise;
    const db = dbClient.db("main");

    const updateResult = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        $set: {
          key: SETTINGS_KEY,
          weights,
          updatedAt: now,
          updatedBy: userId,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    return NextResponse.json({
      success: true,
      source: "database",
      weights,
      updatedAt: updateResult?.updatedAt || now,
      updatedBy: updateResult?.updatedBy || userId,
    });
  } catch (error) {
    console.error("Error updating subject sorting weights:", error);
    return NextResponse.json({ error: "Failed to update sorting weights" }, { status: 500 });
  }
}
