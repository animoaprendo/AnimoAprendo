import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { userId, conversationUserId } = await req.json();

    if (!userId || !conversationUserId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("main");
    const chatsCollection = db.collection("chat");

    // Handle ID format variations for proper matching
    const userIdWithoutPrefix = userId.startsWith("user_")
      ? userId.replace("user_", "")
      : userId;
    const userIdWithPrefix = userId.startsWith("user_")
      ? userId
      : `user_${userId}`;
    
    const conversationUserWithoutPrefix = conversationUserId.startsWith("user_")
      ? conversationUserId.replace("user_", "")
      : conversationUserId;
    const conversationUserWithPrefix = conversationUserId.startsWith("user_")
      ? conversationUserId
      : `user_${conversationUserId}`;

    // Update all messages in the conversation where:
    // 1. The message is from the conversation user (not the current user)
    // 2. The current user is in the recipients
    // 3. The current user is not already in the seenBy array
    const result = await chatsCollection.updateMany(
      {
        $and: [
          // Message is from the conversation user
          {
            $or: [
              { creatorId: conversationUserId },
              { creatorId: conversationUserWithoutPrefix },
              { creatorId: conversationUserWithPrefix }
            ]
          },
          // Current user is a recipient
          {
            recipients: {
              $in: [userId, userIdWithoutPrefix, userIdWithPrefix]
            }
          },
          // Current user hasn't seen it yet
          {
            $or: [
              { seenBy: { $exists: false } },
              { seenBy: null },
              { 
                seenBy: { 
                  $nin: [userId, userIdWithoutPrefix, userIdWithPrefix] 
                } 
              }
            ]
          }
        ]
      },
      {
        $addToSet: { seenBy: userId }
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Error marking messages as seen:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark messages as seen" },
      { status: 500 }
    );
  }
}