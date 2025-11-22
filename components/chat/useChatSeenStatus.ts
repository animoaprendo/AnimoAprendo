"use client";

import { useState, useCallback } from "react";
import { Message, User, getMessageId } from "./types";
import {
  migrateSeenMessages,
  markMessagesAsSeen as markSeenAction,
} from "@/app/actions";

export function useChatSeenStatus(
  userId: string,
  isWindowFocused: boolean,
  allChats: Message[]
) {
  // Function to recalculate unread counts for all users based on current message state
  const recalculateUnreadCounts = useCallback(() => {
    return (prevUsers: User[]) =>
      prevUsers.map((user) => {
        const otherUserId = user.id;

        // Calculate unread count for this user (messages not seen by current user)
        const messagesFromOtherUser = allChats.filter(
          (msg: Message) =>
            msg.creatorId !== userId && // Message not from current user
            msg.recipients.includes(otherUserId) && // Message involves this user
            msg.recipients.includes(userId) // Message involves current user
        );

        const unreadMessages = messagesFromOtherUser.filter(
          (msg: Message) => !msg.seenBy || !msg.seenBy.includes(userId) // Message not seen by current user
        );

        return {
          ...user,
          unreadCount: unreadMessages.length,
        };
      });
  }, [allChats, userId]);

  // Function to mark messages as seen by current user (only when window is focused)
  const markMessagesAsSeen = useCallback(
    async (conversationUserId: string) => {
      if (!userId || !isWindowFocused) {
        return { success: false, updateUI: false };
      }

      try {
        const result = await markSeenAction(userId, conversationUserId);

        if (result.success && result.data && result.data.modifiedCount > 0) {
          return { success: true, updateUI: true, result };
        }

        return { success: true, updateUI: false };
      } catch (error) {
        console.error("Error marking messages as seen:", error);
        return { success: false, updateUI: false };
      }
    },
    [userId, isWindowFocused]
  );

  return {
    markMessagesAsSeen,
    recalculateUnreadCounts,
  };
}
