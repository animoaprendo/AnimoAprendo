import { NextResponse } from "next/server";
import { getSubjectSortingWeights } from "@/lib/subject-sorting-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const weights = await getSubjectSortingWeights();
    return NextResponse.json({ success: true, weights });
  } catch (error) {
    console.error("Error fetching effective subject sorting weights:", error);
    return NextResponse.json({ error: "Failed to fetch subject sorting weights" }, { status: 500 });
  }
}
