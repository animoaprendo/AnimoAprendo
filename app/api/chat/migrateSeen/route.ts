import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
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

    console.log(`Migration for user: ${userId}`);
    console.log(`User ID variations: ${userIdWithoutPrefix}, ${userIdWithPrefix}`);

    // First, let's see ALL messages in the chat collection to understand the structure
    const allMessages = await chatsCollection.find({}).limit(3).toArray();
    console.log(`Total messages in chat collection: ${allMessages.length}`);
    if (allMessages.length > 0) {
      console.log('Sample message structure:', JSON.stringify(allMessages[0], null, 2));
    }

    // Now let's see all messages involving this user
    const allUserMessages = await chatsCollection.find({
      recipients: {
        $in: [userId, userIdWithoutPrefix, userIdWithPrefix]
      }
    }).limit(5).toArray();

    console.log(`Messages involving user ${userId}: ${allUserMessages.length}`);
    if (allUserMessages.length > 0) {
      console.log('Sample user message:', JSON.stringify(allUserMessages[0], null, 2));
    }

    // Find all messages where current user is a recipient but not the creator
    // and don't have seenBy field or current user is not in seenBy
    const messagesToUpdate = await chatsCollection.find({
      $and: [
        // Current user is a recipient
        {
          recipients: {
            $in: [userId, userIdWithoutPrefix, userIdWithPrefix]
          }
        },
        // Current user is NOT the creator
        {
          creatorId: {
            $nin: [userId, userIdWithoutPrefix, userIdWithPrefix]
          }
        },
        // Message doesn't have seenBy or user is not in seenBy
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
        },
        // Migration: process all messages (no time restriction since this is a one-time data fix)
        // In production, you might want to add a time restriction if needed
      ]
    }).toArray();

    console.log(`Found ${messagesToUpdate.length} messages to mark as seen for user ${userId}`);
    
    // Log some sample messages for debugging
    if (messagesToUpdate.length > 0) {
      console.log('Sample message to update:', JSON.stringify(messagesToUpdate[0], null, 2));
    }

    // Update all these messages to include current user in seenBy
    const result = await chatsCollection.updateMany(
      {
        $and: [
          {
            recipients: {
              $in: [userId, userIdWithoutPrefix, userIdWithPrefix]
            }
          },
          {
            creatorId: {
              $nin: [userId, userIdWithoutPrefix, userIdWithPrefix]
            }
          },
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
          },

        ]
      },
      {
        $addToSet: { seenBy: userId }
      }
    );

    console.log(`Migration update result:`, result);
    console.log(`Messages matched: ${result.matchedCount}, Messages modified: ${result.modifiedCount}`);

    // Always ensure all messages have the seenBy field
    console.log('Ensuring all messages have seenBy field...');
    const simpleResult = await chatsCollection.updateMany(
      {
        seenBy: { $exists: false }
      },
      {
        $set: { seenBy: [] }
      }
    );
    console.log(`Added seenBy field to ${simpleResult.modifiedCount} messages`);

    // Return the result of adding the field, which is more important than the complex query
    const totalModified = Math.max(result.modifiedCount, simpleResult.modifiedCount);
    
    return NextResponse.json({
      success: true,
      messagesFound: messagesToUpdate.length,
      modifiedCount: totalModified,
      message: `Migration complete: Added seenBy field to ${simpleResult.modifiedCount} messages, marked ${result.modifiedCount} as seen`
    });

    return NextResponse.json({
      success: true,
      messagesFound: messagesToUpdate.length,
      modifiedCount: result.modifiedCount,
      message: `Marked ${result.modifiedCount} old messages as seen`
    });

  } catch (error) {
    console.error("Error in migration:", error);
    return NextResponse.json(
      { success: false, error: "Migration failed" },
      { status: 500 }
    );
  }
}