"use client";

import { useState, useCallback } from "react";
import { Message, User, getMessageId } from "./types";
import { sendMessage } from "@/app/actions";

export function useMessageManagement(
  userId: string,
  userRole: "tutee" | "tutor"
) {
  // Client-side message deduplication
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(
    new Set()
  );
  const [sentMessageIds, setSentMessageIds] = useState<Set<string>>(new Set());

  // Generate unique message ID for client-side deduplication
  const generateMessageId = useCallback(
    (content: string, timestamp: number, activeUserId?: string): string => {
      return `${userId}_${activeUserId}_${timestamp}_${content.slice(0, 10).replace(/\s/g, "")}`;
    },
    [userId]
  );

  // Handle sending messages with optimistic updates
  const handleSendMessage = useCallback(
    async (
      newMessage: string,
      activeUser: User,
      replyTo: string | null,
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
      setUsers: React.Dispatch<React.SetStateAction<User[]>>,
      clearInput: () => void
    ) => {
      if (!newMessage.trim() || !activeUser || !userId) return;

      // Generate unique ID for this message attempt
      const messageId = generateMessageId(
        newMessage,
        Date.now(),
        activeUser.id
      );

      // Check if this exact message is already being sent or was recently sent
      if (pendingMessages.has(messageId) || sentMessageIds.has(messageId)) {
        console.log(
          "Message already being sent or recently sent, ignoring duplicate"
        );
        return;
      }

      // Check for duplicate content in recent messages (last 5 seconds)
      const recentDuplicateId = Array.from(sentMessageIds).find((id) => {
        const [, , timestamp, contentHash] = id.split("_");
        const messageAge = Date.now() - parseInt(timestamp);
        const currentContentHash = newMessage.slice(0, 10).replace(/\s/g, "");
        return messageAge < 5000 && contentHash === currentContentHash;
      });

      if (recentDuplicateId) {
        console.log(
          "Duplicate message content detected in last 5 seconds, ignoring"
        );
        return;
      }

      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        _id: messageId, // Use our generated ID as temporary ID
        creatorId: userId,
        message: newMessage,
        createdAt: new Date().toISOString(),
        replyTo: replyTo,
        recipients: [userId, activeUser.id],
        senderRole: userRole,
        type: "text",
      };

      // Add optimistic message immediately to UI
      setMessages((prev) => [...prev, optimisticMessage]);

      // Clear input and reply state immediately for better UX
      const messageToSend = newMessage;
      const replyToSend = replyTo;
      clearInput();

      // Update user's last message immediately
      setUsers((prev) =>
        prev.map((user) =>
          user.id === activeUser.id
            ? {
                ...user,
                lastMessage: messageToSend,
                lastMessageTime: optimisticMessage.createdAt,
                lastMessageCreatorId: optimisticMessage.creatorId,
              }
            : user
        )
      );

      // Mark as pending for backend processing
      setPendingMessages((prev) => new Set([...prev, messageId]));

      try {
        const messageData = {
          creatorId: userId,
          message: messageToSend,
          recipients: [userId, activeUser.id],
          replyTo: replyToSend,
          senderRole: userRole,
          type: "text" as const,
        };

        const result = await sendMessage(messageData);

        if (result.success) {
          // Mark as sent and remove from pending
          setSentMessageIds((prev) => new Set([...prev, messageId]));
          setPendingMessages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });

          // Update the optimistic message with the real message ID from server
          if (result.data && result.data._id) {
            setMessages((prev) =>
              prev.map((msg) =>
                getMessageId(msg) === messageId
                  ? { ...msg, _id: result.data._id }
                  : msg
              )
            );
          }

          // Clean up old sent message IDs (keep only last 50 messages)
          setSentMessageIds((prev) => {
            const sortedIds = Array.from(prev).sort((a, b) => {
              const timestampA = parseInt(a.split("_")[2]);
              const timestampB = parseInt(b.split("_")[2]);
              return timestampB - timestampA;
            });
            return new Set(sortedIds.slice(0, 50));
          });
        } else {
          // Remove optimistic message on failure
          setMessages((prev) =>
            prev.filter((msg) => getMessageId(msg) !== messageId)
          );

          // Remove from pending on failure
          setPendingMessages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });

          console.error("Failed to send message:", result.error);
          return { success: false, error: result.error };
        }
      } catch (error) {
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => getMessageId(msg) !== messageId)
        );

        // Remove from pending on error
        setPendingMessages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });

        console.error("Error sending message:", error);
        return { success: false, error: error };
      }

      return { success: true };
    },
    [userId, userRole, generateMessageId, pendingMessages, sentMessageIds]
  );

  // Clear pending messages when switching users
  const clearPendingMessages = useCallback(() => {
    setPendingMessages(new Set());
  }, []);

  return {
    pendingMessages,
    sentMessageIds,
    handleSendMessage,
    clearPendingMessages,
    setPendingMessages,
    setSentMessageIds,
  };
}
