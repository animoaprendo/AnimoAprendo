"use client";

import { InfoIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { createGoogleMeetMeetingWithAuth, createMeetingTimes } from "@/lib/google-meet";

// Import all our new components
import AppointmentModal from "./AppointmentModal";
import ChatInput, { ChatInputRef } from "./ChatInput";
import ChatSidebar from "./ChatSidebar";
import MessagesContainer from "./MessagesContainer";
import MobileSidebar from "./MobileSidebar";
import UserList from "./UserList";

// Import types and hooks
import { Inquiry, Message, User, UserData, getMessageId } from "./types";
import { useChatSeenStatus } from "./useChatSeenStatus";
import { useMessageManagement } from "./useMessageManagement";

// Import server actions
import {
  fetchAppointments,
  fetchChats,
  fetchUsers,
  getInquiry,
  getInquiryByOffering,
  sendMessage,
  updateAppointmentStatus,
} from "@/app/actions";

// Import socket hook
import { useSocket } from "@/hooks/use-socket";

interface ChatContainerProps {
  userId?: string;
  recipientId?: string;
  userRole?: "tutee" | "tutor";
  offeringId?: string;
}

export default function ChatContainer({
  userId = "test-user-id",
  recipientId,
  userRole = "tutee",
  offeringId,
}: ChatContainerProps) {
  const router = useRouter();
  // Get current user from Clerk
  const { user: clerkUser } = useUser();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allChats, setAllChats] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUserListDrawer, setShowUserListDrawer] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("08:00");
  const [appointmentDurationOption, setAppointmentDurationOption] = useState<
    "15" | "30" | "45" | "60" | "120" | "custom"
  >("60");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>("90");
  const [appointmentMode, setAppointmentMode] = useState<
    "online" | "in-person"
  >("online");
  const [appointmentType, setAppointmentType] = useState<
    "single" | "recurring"
  >("single");
  const [selectedRecurringDates, setSelectedRecurringDates] = useState<string[]>(
    []
  );
  const [subjectAvailability, setSubjectAvailability] = useState<any[]>([]);
  const [showDeclineReasonModal, setShowDeclineReasonModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pendingDeclineMessage, setPendingDeclineMessage] = useState<Message | null>(null);

  // Appointment data
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [appointmentsWithoutQuiz, setAppointmentsWithoutQuiz] = useState<any[]>(
    []
  );

  const chatInputRef = useRef<ChatInputRef>(null);

  // Custom hooks
  const { markMessagesAsSeen } = useChatSeenStatus(
    userId,
    isWindowFocused,
    allChats
  );
  const { pendingMessages, handleSendMessage, clearPendingMessages } =
    useMessageManagement(userId, userRole);

  // Handle real-time messages
  const handleRealtimeMessage = useCallback(
    (newMessage: Message) => {
      console.log("Real-time message received:", newMessage);

      const normalizeId = (id?: string) => {
        if (!id) return "";
        return id.startsWith("user_") ? id.replace("user_", "") : id;
      };

      const messageId = getMessageId(newMessage);
      const alreadyExists = allChats.some(
        (msg) => getMessageId(msg) === messageId
      );
      const isOwnMessage = normalizeId(newMessage.creatorId) === normalizeId(userId);

      if (!alreadyExists && !isOwnMessage) {
        const creatorNormalized = normalizeId(newMessage.creatorId);
        const sender = users.find(
          (u) => normalizeId(u.id) === creatorNormalized
        );

        const activeConversationMatchesSender =
          activeUser && normalizeId(activeUser.id) === creatorNormalized;
        const shouldShowToast = !activeConversationMatchesSender || !isWindowFocused;

        if (shouldShowToast) {
          const senderName = sender?.name || "New message";
          const rawPreview =
            typeof newMessage.message === "string" && newMessage.message.trim().length > 0
              ? newMessage.message.trim()
              : newMessage.type === "appointment"
              ? "Sent an appointment update"
              : "Sent you a message";
          const preview =
            rawPreview.length > 90 ? `${rawPreview.slice(0, 90)}...` : rawPreview;

          const openConversationFromToast = () => {
            const creatorVariations = [
              newMessage.creatorId,
              normalizeId(newMessage.creatorId),
              `user_${normalizeId(newMessage.creatorId)}`,
            ].filter(Boolean);

            const matchedUser = users.find((u) => {
              const userVariations = [
                u.id,
                normalizeId(u.id),
                `user_${normalizeId(u.id)}`,
              ];
              return creatorVariations.some((variation) =>
                userVariations.includes(String(variation))
              );
            });

            if (matchedUser) {
              setActiveUser(matchedUser);
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === matchedUser.id ? { ...u, unreadCount: 0 } : u
                )
              );
              setShowUserListDrawer(false);
              setIsDrawerAnimating(false);
            }
          };

          toast.custom((t) => (
            <div className="pointer-events-auto w-full max-w-sm rounded-lg border bg-background p-4 shadow-md">
              <div className="space-y-2">
                <p className="text-sm font-semibold">{senderName}</p>
                <p className="text-sm text-muted-foreground">{preview}</p>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openConversationFromToast();
                      toast.dismiss(t);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>
          ));
        }
      }

      // Check if this message should be visible on current role page
      const shouldShowMessage =
        activeUser &&
        newMessage.recipients.some((id) => {
          const userIdWithoutPrefix = userId!.startsWith("user_")
            ? userId!.replace("user_", "")
            : userId!;
          const userIdWithPrefix = userId!.startsWith("user_")
            ? userId!
            : `user_${userId!}`;
          const activeUserWithoutPrefix = activeUser.id.startsWith("user_")
            ? activeUser.id.replace("user_", "")
            : activeUser.id;
          const activeUserWithPrefix = activeUser.id.startsWith("user_")
            ? activeUser.id
            : `user_${activeUser.id}`;

          const userInRecipients = [
            userId,
            userIdWithoutPrefix,
            userIdWithPrefix,
          ].includes(id);
          const activeUserInRecipients = newMessage.recipients.some((recipId) =>
            [
              activeUser.id,
              activeUserWithoutPrefix,
              activeUserWithPrefix,
            ].includes(recipId)
          );

          return userInRecipients && activeUserInRecipients;
        });

      if (shouldShowMessage) {
        setMessages((prev) => {
          const messageId = getMessageId(newMessage);
          const existingIndex = prev.findIndex(
            (msg) => getMessageId(msg) === messageId
          );

          let messageToAdd = newMessage;

          // If message is from active user and current user is not the creator, mark as seen immediately (only if window focused)
          if (
            activeUser &&
            newMessage.creatorId === activeUser.id &&
            newMessage.creatorId !== userId &&
            isWindowFocused
          ) {
            messageToAdd = {
              ...newMessage,
              seenBy: [...(newMessage.seenBy || []), userId],
            };
            markMessagesAsSeen(activeUser.id);
          }

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = messageToAdd;
            return updated;
          } else {
            // Check if this is from the current user and we might have an optimistic version
            if (newMessage.creatorId === userId) {
              const possibleOptimistic = prev.find(
                (msg) =>
                  msg.creatorId === userId &&
                  msg.message === newMessage.message &&
                  Math.abs(
                    new Date(msg.createdAt).getTime() -
                      new Date(newMessage.createdAt).getTime()
                  ) < 10000
              );

              if (possibleOptimistic) {
                const updated = prev.map((msg) =>
                  getMessageId(msg) === getMessageId(possibleOptimistic)
                    ? messageToAdd
                    : msg
                );
                return updated;
              }
            }

            return [...prev, messageToAdd].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          }
        });
      }

      // Always add to allChats for conversation list or update existing
      setAllChats((prev) => {
        const messageId = getMessageId(newMessage);
        const existingIndex = prev.findIndex(
          (msg) => getMessageId(msg) === messageId
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated;
        } else {
          return [newMessage, ...prev];
        }
      });

      // Update users list with new message and unread count, or add new user if it's a new conversation
      setUsers((prev) => {
        // Check if message involves current user
        const userIdWithoutPrefix = userId!.startsWith("user_")
          ? userId!.replace("user_", "")
          : userId!;
        const userIdWithPrefix = userId!.startsWith("user_")
          ? userId!
          : `user_${userId!}`;
        const isMessageForCurrentUser = newMessage.recipients.some((id) =>
          [userId, userIdWithoutPrefix, userIdWithPrefix].includes(id)
        );

        if (!isMessageForCurrentUser) {
          return prev; // Message doesn't involve current user
        }

        // Check if the message creator is already in the users list
        const messageCreatorId = newMessage.creatorId;
        const messageCreatorVariations = [
          messageCreatorId,
          messageCreatorId.startsWith("user_")
            ? messageCreatorId.replace("user_", "")
            : `user_${messageCreatorId}`,
          messageCreatorId.startsWith("user_")
            ? messageCreatorId
            : `user_${messageCreatorId}`,
        ];

        const existingUserIndex = prev.findIndex((user) =>
          messageCreatorVariations.some(
            (variation) =>
              user.id === variation ||
              (user.id.startsWith("user_")
                ? user.id.replace("user_", "")
                : `user_${user.id}`) === variation
          )
        );

        if (existingUserIndex >= 0) {
          // Update existing user
          return prev.map((user, index) => {
            if (index === existingUserIndex) {
              const isMessageFromThisUser = messageCreatorVariations.some(
                (variation) =>
                  user.id === variation ||
                  (user.id.startsWith("user_")
                    ? user.id.replace("user_", "")
                    : `user_${user.id}`) === variation
              );

              if (isMessageFromThisUser && newMessage.creatorId !== userId) {
                const isMessageSeen =
                  newMessage.seenBy && newMessage.seenBy.includes(userId);
                const isActiveConversation = activeUser?.id === user.id;
                const isWindowFocused = !document.hidden && document.hasFocus();

                const shouldIncrementUnread =
                  !(isActiveConversation && isWindowFocused) && !isMessageSeen;

                return {
                  ...user,
                  lastMessage: newMessage.message,
                  lastMessageTime: newMessage.createdAt,
                  lastMessageCreatorId: newMessage.creatorId,
                  unreadCount: shouldIncrementUnread
                    ? user.unreadCount + 1
                    : user.unreadCount,
                };
              } else if (
                isMessageFromThisUser &&
                newMessage.creatorId === userId &&
                activeUser?.id === user.id
              ) {
                return {
                  ...user,
                  lastMessage: newMessage.message,
                  lastMessageTime: newMessage.createdAt,
                  lastMessageCreatorId: newMessage.creatorId,
                };
              }
            }
            return user;
          });
        } else if (newMessage.creatorId !== userId) {
          // New conversation started by someone else - add new user to the list
          const normalizedCreatorId = messageCreatorId.startsWith("user_")
            ? messageCreatorId
            : `user_${messageCreatorId}`;

          const newUser: User = {
            id: normalizedCreatorId,
            name: `User ${messageCreatorId.slice(-4)}`, // Temporary name
            lastMessage: newMessage.message,
            lastMessageTime: newMessage.createdAt,
            lastMessageCreatorId: newMessage.creatorId,
            unreadCount: 1, // New conversation with unread message
            isTyping: false,
          };

          // Fetch real user data in the background
          const fetchUserData = async () => {
            try {
              const mongoUserId = messageCreatorId.startsWith("user_")
                ? messageCreatorId.replace("user_", "")
                : messageCreatorId;
              const userResult = await fetchUsers([mongoUserId]);

              if (
                userResult.success &&
                userResult.data.users &&
                userResult.data.users.length > 0
              ) {
                const userData = userResult.data.users[0];

                setUsers((currentUsers) =>
                  currentUsers.map((user) =>
                    user.id === normalizedCreatorId
                      ? {
                          ...user,
                          name:
                            userData.displayName ||
                            `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
                            user.name,
                          firstName: userData.firstName,
                          lastName: userData.lastName,
                          username: userData.username,
                          emailAddress: userData.emailAddress,
                          imageUrl: userData.imageUrl,
                          tuteeAvailability: userData.tuteeAvailability,
                          tutorAvailability: userData.tutorAvailability,
                        }
                      : user
                  )
                );
              }
            } catch (error) {
              console.error(
                "Error fetching user data for new conversation:",
                error
              );
            }
          };

          fetchUserData();

          // Add new user to the beginning of the list
          return [newUser, ...prev];
        }

        return prev;
      });
    },
    [activeUser, userId, isWindowFocused, markMessagesAsSeen, allChats, users]
  );

  // Set up Socket.IO connection
  const { socket, isConnected } = useSocket(
    userId,
    userRole,
    handleRealtimeMessage
  );

  // Track window focus
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      if (activeUser) {
        markMessagesAsSeen(activeUser.id);
      }
    };

    const handleBlur = () => setIsWindowFocused(false);

    const handleVisibilityChange = () => {
      const isFocused = !document.hidden;
      setIsWindowFocused(isFocused);
      if (isFocused && activeUser) {
        markMessagesAsSeen(activeUser.id);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    setIsWindowFocused(!document.hidden && document.hasFocus());

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeUser, markMessagesAsSeen]);

  // Fetch appointment data
  useEffect(() => {
    if (!userId || !activeUser) return;

    const fetchAppointmentData = async () => {
      try {
        const result = await fetchAppointments(userId);
        if (result.success && result.appointments) {
          const now = new Date();

          // Get normalized IDs for the active user
          const activeUserWithoutPrefix = activeUser.id.startsWith("user_")
            ? activeUser.id.replace("user_", "")
            : activeUser.id;
          const activeUserWithPrefix = activeUser.id.startsWith("user_")
            ? activeUser.id
            : `user_${activeUser.id}`;
          const activeUserVariations = [
            activeUser.id,
            activeUserWithoutPrefix,
            activeUserWithPrefix,
          ];

          // Filter appointments to only include those involving the active chat user
          const appointmentsWithActiveUser = result.appointments.filter(
            (apt: any) => {
              const isInvolvingActiveUser = activeUserVariations.some(
                (variation) =>
                  apt.tuteeId === variation || apt.tutorId === variation
              );
              return isInvolvingActiveUser;
            }
          );

          const upcoming = appointmentsWithActiveUser
            .filter((apt: any) => {
              // Show accepted appointments that are in the future (normal upcoming)
              const isUpcoming =
                apt.status === "accepted" && new Date(apt.datetimeISO) > now;

              // Show accepted appointments with quizzes (for pre-session quiz)
              const isAcceptedWithQuiz =
                apt.status === "accepted" && apt.quiz && apt.quiz.length > 0;

              // Show completed appointments with quizzes available for post-session quiz
              const isCompletedWithQuiz =
                apt.status === "completed" && apt.quiz && apt.quiz.length > 0;

              if (isUpcoming) return true;

              if (isAcceptedWithQuiz || isCompletedWithQuiz) {
                const quizAttempts = apt.quizAttempts || [];
                const hasCompletedAttempt1 = quizAttempts.some(
                  (attempt: any) =>
                    attempt.attempt === 1 && attempt.tuteeId === userId
                );
                const hasCompletedAttempt2 = quizAttempts.some(
                  (attempt: any) =>
                    attempt.attempt === 2 && attempt.tuteeId === userId
                );

                // For accepted appointments: show if attempt 1 not completed
                if (apt.status === "accepted") {
                  return !hasCompletedAttempt1;
                }

                // For completed appointments: show if attempt 1 is done but attempt 2 is not
                if (apt.status === "completed") {
                  return hasCompletedAttempt1 && !hasCompletedAttempt2;
                }
              }

              return false;
            })
            .sort(
              (a: any, b: any) =>
                new Date(a.datetimeISO).getTime() -
                new Date(b.datetimeISO).getTime()
            );

          setUpcomingAppointments(upcoming);

          const appointmentsNeedingQuiz = appointmentsWithActiveUser.filter(
            (apt: any) =>
              apt.status === "accepted" &&
              apt.tutorId === userId &&
              (!apt.quiz || apt.quiz.length === 0)
          );
          setAppointmentsWithoutQuiz(appointmentsNeedingQuiz);
        }
      } catch (error) {
        console.error("Error fetching appointment data:", error);
      }
    };

    fetchAppointmentData();
  }, [userId, activeUser, messages]);

  // Fetch chat data
  useEffect(() => {
    const loadChatsData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchChats(userId, userRole);

        if (!result.success) {
          console.error("Chat API error:", result.error);
          setLoading(false);
          return;
        }

        const data = result.data;
        let usersList: User[] = [];

        if (data.chats && data.chats.length > 0) {
          setAllChats(data.chats);

          const userMap = new Map<string, User>();
          const allOtherUserIds = new Set<string>();

          data.chats.forEach((chat: Message) => {
            const userIdWithoutPrefix = userId.startsWith("user_")
              ? userId.replace("user_", "")
              : userId;
            const userIdWithPrefix = userId.startsWith("user_")
              ? userId
              : `user_${userId}`;

            const otherUsers = chat.recipients.filter(
              (id) =>
                id !== userId &&
                id !== userIdWithoutPrefix &&
                id !== userIdWithPrefix
            );

            otherUsers.forEach((otherUserId) => {
              const normalizedId = otherUserId.startsWith("user_")
                ? otherUserId
                : `user_${otherUserId}`;
              allOtherUserIds.add(otherUserId);

              if (!userMap.has(normalizedId)) {
                const messagesFromOtherUser = data.chats.filter(
                  (msg: Message) =>
                    msg.creatorId !== userId &&
                    msg.recipients.includes(otherUserId) &&
                    msg.recipients.includes(userId)
                );

                const unreadMessages = messagesFromOtherUser.filter(
                  (msg: Message) => !msg.seenBy || !msg.seenBy.includes(userId)
                );

                const unreadCount = unreadMessages.length;

                // Find the most recent message involving this user and current user
                const conversationMessages = data.chats.filter(
                  (msg: Message) =>
                    msg.recipients.includes(otherUserId) &&
                    msg.recipients.includes(userId)
                );
                const mostRecentMessage = conversationMessages.reduce(
                  (latest: Message, current: Message) =>
                    new Date(current.createdAt) > new Date(latest.createdAt)
                      ? current
                      : latest,
                  conversationMessages[0]
                );

                userMap.set(normalizedId, {
                  id: normalizedId,
                  name: `User ${otherUserId.slice(-4)}`,
                  lastMessage: mostRecentMessage.message,
                  lastMessageTime: mostRecentMessage.createdAt,
                  lastMessageCreatorId: mostRecentMessage.creatorId,
                  unreadCount: unreadCount,
                  isTyping: false,
                });
              }
            });
          });

          // Fetch real user data
          if (allOtherUserIds.size > 0) {
            const userIdsArray = Array.from(allOtherUserIds);
            const userResult = await fetchUsers(userIdsArray);

            if (userResult.success && userResult.data.users) {
              userResult.data.users.forEach((user: UserData) => {
                const normalizedId = user.id.startsWith("user_")
                  ? user.id
                  : `user_${user.id}`;
                if (userMap.has(normalizedId)) {
                  const existingUser = userMap.get(normalizedId)!;
                  userMap.set(normalizedId, {
                    ...existingUser,
                    name:
                      user.displayName ||
                      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                      existingUser.name,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    emailAddress: user.emailAddress,
                    imageUrl: user.imageUrl,
                    tuteeAvailability: user.tuteeAvailability,
                    tutorAvailability: user.tutorAvailability,
                  });
                }
              });
            }
          }

          usersList = Array.from(userMap.values());
        } else {
          setAllChats([]);
        }

        // Handle recipientId logic
        if (recipientId) {
          let recipient = usersList.find((user) => user.id === recipientId);
          if (!recipient && recipientId.startsWith("user_")) {
            const idWithoutPrefix = recipientId.replace("user_", "");
            recipient = usersList.find((user) => user.id === idWithoutPrefix);
          }
          if (!recipient && !recipientId.startsWith("user_")) {
            const idWithPrefix = `user_${recipientId}`;
            recipient = usersList.find((user) => user.id === idWithPrefix);
          }

          if (
            recipient &&
            !recipient.name.startsWith("User ") &&
            recipient.name !== "Loading user..."
          ) {
            setUsers(usersList);
            setActiveUser(recipient);
          } else {
            // Create placeholder and fetch real user data
            const placeholderUser: User = {
              id: recipientId,
              name: "Loading user...",
              lastMessage: "",
              unreadCount: 0,
              isTyping: false,
            };

            try {
              const mongoUserId = recipientId.startsWith("user_")
                ? recipientId.replace("user_", "")
                : recipientId;
              const userResult = await fetchUsers([mongoUserId]);
              if (
                userResult.success &&
                userResult.data.users &&
                userResult.data.users.length > 0
              ) {
                const userData = userResult.data.users[0];
                const updatedUser = {
                  ...placeholderUser,
                  name:
                    userData.displayName ||
                    `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
                    placeholderUser.name,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  username: userData.username,
                  emailAddress: userData.emailAddress,
                  imageUrl: userData.imageUrl,
                  tuteeAvailability: userData.tuteeAvailability,
                  tutorAvailability: userData.tutorAvailability,
                };
                setUsers([updatedUser, ...usersList]);
                setActiveUser(updatedUser);
              } else {
                setUsers([placeholderUser, ...usersList]);
                setActiveUser(placeholderUser);
              }
            } catch (error) {
              setUsers([placeholderUser, ...usersList]);
              setActiveUser(placeholderUser);
            }
          }
        } else {
          setUsers(usersList);
          if (usersList.length > 0) {
            setActiveUser(usersList[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChatsData();
  }, [userId, recipientId, userRole]);

  // Filter messages for active user
  useEffect(() => {
    if (activeUser && allChats.length > 0) {
      const userIdWithoutPrefix = userId!.startsWith("user_")
        ? userId!.replace("user_", "")
        : userId!;
      const userIdWithPrefix = userId!.startsWith("user_")
        ? userId!
        : `user_${userId!}`;
      const activeUserWithoutPrefix = activeUser.id.startsWith("user_")
        ? activeUser.id.replace("user_", "")
        : activeUser.id;
      const activeUserWithPrefix = activeUser.id.startsWith("user_")
        ? activeUser.id
        : `user_${activeUser.id}`;

      const conversationMessages = allChats
        .filter((chat) => {
          const hasActiveUser = chat.recipients.some(
            (id) =>
              id === activeUser.id ||
              id === activeUserWithoutPrefix ||
              id === activeUserWithPrefix
          );
          const hasCurrentUser = chat.recipients.some(
            (id) =>
              id === userId ||
              id === userIdWithoutPrefix ||
              id === userIdWithPrefix
          );
          return hasActiveUser && hasCurrentUser;
        })
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      setMessages(conversationMessages);

      if (conversationMessages.length > 0 && isWindowFocused) {
        markMessagesAsSeen(activeUser.id);
      }
    } else {
      setMessages([]);
    }
  }, [activeUser, allChats, userId, isWindowFocused, markMessagesAsSeen]);

  // Fetch inquiry
  useEffect(() => {
    const fetchInquiry = async () => {
      let otherUserId = null;

      if (activeUser) {
        otherUserId = activeUser.id;
      } else if (recipientId) {
        otherUserId = recipientId;
      }

      if (!otherUserId || !userId) {
        setInquiry(null);
        return;
      }

      try {
        const tuteeId = userRole === "tutee" ? userId : otherUserId;
        const tutorId = userRole === "tutor" ? userId : otherUserId;

        let result;
        if (offeringId) {
          result = await getInquiryByOffering(tuteeId, tutorId, offeringId);
        } else {
          result = await getInquiry(tuteeId, tutorId);
        }

        if (result.success && result.data) {
          setInquiry(result.data);
        } else {
          setInquiry(null);
        }
      } catch (error) {
        console.error("Error fetching inquiry:", error);
        setInquiry(null);
      }
    };

    fetchInquiry();
  }, [activeUser, userId, userRole, recipientId, offeringId]);

  // Fetch subject/offering availability
  useEffect(() => {
    if (!offeringId) {
      setSubjectAvailability([]);
      return;
    }

    const fetchOfferingAvailability = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/getOffering?id=${offeringId}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          // Normalize offering availability to the same structure used by AppointmentModal.
          const offering = data.data;
          const rawAvailability = offering.availability || offering.tuteeAvailability || [];
          const normalizedAvailability = Array.isArray(rawAvailability)
            ? rawAvailability
                .map((slot: any, index: number) => {
                  const normalizedDay = typeof slot?.day === "string" ? slot.day.toLowerCase() : "";

                  if (Array.isArray(slot?.timeRanges)) {
                    return {
                      day: normalizedDay,
                      timeRanges: slot.timeRanges,
                    };
                  }

                  if (slot?.start && slot?.end) {
                    const [startHour = "0", startMinute = "0"] = String(slot.start).split(":");
                    const [endHour = "0", endMinute = "0"] = String(slot.end).split(":");

                    return {
                      day: normalizedDay,
                      timeRanges: [
                        {
                          id: slot.id || `subject-${index}`,
                          timeStart: {
                            hourOfDay: Number.parseInt(startHour, 10) || 0,
                            minute: Number.parseInt(startMinute, 10) || 0,
                          },
                          timeEnd: {
                            hourOfDay: Number.parseInt(endHour, 10) || 0,
                            minute: Number.parseInt(endMinute, 10) || 0,
                          },
                        },
                      ],
                    };
                  }

                  return null;
                })
                .filter((slot): slot is { day: string; timeRanges: any[] } =>
                  Boolean(slot && slot.day && Array.isArray(slot.timeRanges) && slot.timeRanges.length > 0)
                )
            : [];

          console.log("Offering availability (raw):", rawAvailability);
          console.log("Offering availability (normalized):", normalizedAvailability);
          setSubjectAvailability(normalizedAvailability);
        } else {
          setSubjectAvailability([]);
        }
      } catch (error) {
        console.error("Error fetching offering availability:", error);
        setSubjectAvailability([]);
      }
    };

    fetchOfferingAvailability();
  }, [offeringId]);

  // Fetch availability for the active user
  useEffect(() => {
    if (!activeUser) return;

    const fetchAvailability = async () => {
      try {
        const userId_normalized = activeUser.id.startsWith("user_")
          ? activeUser.id.replace("user_", "")
          : activeUser.id;

        console.log("Fetching availability for user:", userId_normalized);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/user-availability?userIds=${userId_normalized}`
        );
        const data = await response.json();

        console.log("Availability fetch response:", data);

        if (data.success && data.data) {
          const userKey = activeUser.id.startsWith("user_")
            ? activeUser.id
            : `user_${activeUser.id}`;
          const availabilityInfo = data.data[userKey] || data.data[userId_normalized];

          console.log("Availability info for user:", availabilityInfo);

          if (availabilityInfo) {
            const updatedActiveUser = {
              ...activeUser,
              tuteeAvailability: availabilityInfo.tuteeAvailability,
              tutorAvailability: availabilityInfo.tutorAvailability,
            };

            setActiveUser(updatedActiveUser);

            setUsers((prev) =>
              prev.map((user) =>
                user.id === activeUser.id
                  ? {
                      ...user,
                      tuteeAvailability: availabilityInfo.tuteeAvailability,
                      tutorAvailability: availabilityInfo.tutorAvailability,
                    }
                  : user
              )
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user availability:", error);
      }
    };

    fetchAvailability();
  }, [activeUser?.id]);

  // Clear pending messages when switching users
  useEffect(() => {
    clearPendingMessages();
  }, [activeUser?.id, clearPendingMessages]);

  // Handle drawer animation state
  useEffect(() => {
    if (showUserListDrawer) {
      // When drawer opens, reset animation state after a brief delay
      const timer = setTimeout(() => setIsDrawerAnimating(false), 50);
      return () => clearTimeout(timer);
    }
  }, [showUserListDrawer]);

  // Event handlers
  const handleUserSelect = useCallback((user: User) => {
    const basePath = userRole === "tutor" ? "/tutor/chat" : "/chat";
    const encodedUserId = encodeURIComponent(user.id);
    const query = userRole === "tutee" && offeringId ? `?offeringId=${encodeURIComponent(offeringId)}` : "";
    const nextPath = `${basePath}/${encodedUserId}${query}`;
    router.push(nextPath);

    // Close mobile drawer when user is selected
    setIsDrawerAnimating(true);
    setTimeout(() => {
      setShowUserListDrawer(false);
      setIsDrawerAnimating(false);
    }, 200);
  }, [router, userRole, offeringId]);

  // Animated drawer functions
  const openDrawer = useCallback(() => {
    setShowUserListDrawer(true);
    setIsDrawerAnimating(false); // Start with animating false so entry animation plays
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerAnimating(true);
    // Wait for exit animation to complete before hiding
    setTimeout(() => {
      setShowUserListDrawer(false);
      setIsDrawerAnimating(false);
    }, 200); // Match the exit animation duration
  }, []);

  const handleSend = useCallback(async () => {
    if (!activeUser) return;

    await handleSendMessage(
      newMessage,
      activeUser,
      replyTo,
      setMessages,
      setUsers,
      () => {
        setNewMessage("");
        setReplyTo(null);
      }
    );
  }, [newMessage, activeUser, replyTo, handleSendMessage]);

  const handleReply = useCallback((messageId: string) => {
    setReplyTo(messageId);
    chatInputRef.current?.focus();
  }, []);

  const handleAppointmentResponse = useCallback(
    async (msg: Message, action: "accepted" | "declined" | "cancelled") => {
      if (action === "declined") {
        setPendingDeclineMessage(msg);
        setDeclineReason("");
        setShowDeclineReasonModal(true);
        return;
      }

      try {
        const messageId = getMessageId(msg);
        const result = await updateAppointmentStatus({
          messageId,
          status: action,
          actorId: userId!,
        });

        if (result.success) {
          console.log("Appointment status updated:", result.data);

          const appointment = msg.appointment;
          const shouldCreateMeeting =
            action === "accepted" &&
            appointment?.mode === "online" &&
            !appointment?.meetingUrl;

          if (shouldCreateMeeting && appointment?.datetimeISO) {
            const appointmentDate = new Date(appointment.datetimeISO);
            const { startDateTime, endDateTime } = createMeetingTimes(
              appointmentDate,
              appointment.durationMinutes || 60
            );

            const meetingResult = await createGoogleMeetMeetingWithAuth(
              {
                startDateTime,
                endDateTime,
                subject: appointment.subject || "Tutoring Session",
              },
              userId
            );

            if (meetingResult.success && meetingResult.meeting?.joinUrl) {
              const attachMeetingResult = await updateAppointmentStatus({
                messageId,
                status: action,
                actorId: userId!,
                meetingUrl: meetingResult.meeting.joinUrl,
                meetingId: meetingResult.meeting.id,
              });

              if (attachMeetingResult.success) {
                console.log("Google Meet link saved to appointment:", meetingResult.meeting.joinUrl);
              } else {
                console.warn("Appointment accepted, but failed to save Google Meet link:", attachMeetingResult.error);
              }
            } else {
              console.warn("Appointment accepted, but Google Meet creation failed:", meetingResult.error);
            }
          }
        }
      } catch (error) {
        console.error("Error updating appointment status:", error);
      }
    },
    [userId]
  );

  const handleSubmitDeclineReason = useCallback(async () => {
    if (!pendingDeclineMessage || !userId) return;

    const trimmedReason = declineReason.trim();
    if (!trimmedReason) {
      toast.error("Please provide a reason for declining.");
      return;
    }

    try {
      const messageId = getMessageId(pendingDeclineMessage);
      const result = await updateAppointmentStatus({
        messageId,
        status: "declined",
        actorId: userId,
        declineReason: trimmedReason,
      });

      if (result.success) {
        setShowDeclineReasonModal(false);
        setPendingDeclineMessage(null);
        setDeclineReason("");
      }
    } catch (error) {
      console.error("Error declining appointment status:", error);
    }
  }, [pendingDeclineMessage, userId, declineReason]);

  const handleSendAppointment = useCallback(async () => {
    if (!activeUser || !userId || !appointmentTime) return;

    const durationMinutes =
      appointmentDurationOption === "custom"
        ? Number(customDurationMinutes)
        : Number(appointmentDurationOption);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return;

    const sortedRecurringDates = [...selectedRecurringDates].sort((a, b) =>
      a.localeCompare(b)
    );
    const startDateString =
      appointmentType === "recurring" ? sortedRecurringDates[0] : appointmentDate;

    if (!startDateString) return;
    if (appointmentType === "recurring" && sortedRecurringDates.length === 0) return;

    const dt = new Date(`${startDateString}T${appointmentTime}`);
    const datetimeISO = dt.toISOString();
    const durationLabel =
      durationMinutes >= 60 && durationMinutes % 60 === 0
        ? `${durationMinutes / 60} hr`
        : `${durationMinutes} min`;

    const recurringDateSummary = sortedRecurringDates
      .slice(0, 4)
      .map((dateString) =>
        new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      )
      .join(", ");
    const hasMoreRecurringDates = sortedRecurringDates.length > 4;

    try {
      const appointmentMessage =
        appointmentType === "recurring"
          ? `Recurring appointment request (${sortedRecurringDates.length} sessions) on ${recurringDateSummary}${
              hasMoreRecurringDates ? ", ..." : ""
            } at ${dt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })} for ${durationLabel} (${appointmentMode})`
          : `Appointment request for ${dt.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })} at ${dt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })} for ${durationLabel} (${appointmentMode})`;

      const result = await sendMessage({
        creatorId: userId,
        message: appointmentMessage,
        recipients: [userId, activeUser.id],
        replyTo: null,
        senderRole: userRole,
        type: "appointment",
        appointment: {
          appointmentType,
          endDate:
            appointmentType === "recurring" && sortedRecurringDates.length > 0
              ? sortedRecurringDates[sortedRecurringDates.length - 1]
              : undefined,
          selectedDates:
            appointmentType === "recurring" ? sortedRecurringDates : undefined,
          startDate: new Date(`${startDateString}T00:00:00`).toISOString(),
          datetimeISO,
          durationMinutes,
          mode: appointmentMode,
          status: "pending",
          subject: inquiry?.subject || "Tutoring Session",
          offeringId: offeringId || undefined,
        },
      });

      if (result.success) {
        setShowAppointmentModal(false);
        setSelectedRecurringDates([]);
      }
    } catch (error) {
      console.error("Error sending appointment:", error);
    }
  }, [
    activeUser,
    userId,
    appointmentDate,
    appointmentTime,
    appointmentDurationOption,
    customDurationMinutes,
    appointmentMode,
    userRole,
    inquiry,
    offeringId,
    appointmentType,
    selectedRecurringDates,
  ]);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 h-[92vh] max-h-[92vh] bg-gray-100 flex items-center justify-center w-full">
        <div className="text-center">
          <div className="text-green-700 mb-2">Loading conversations...</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && users.length === 0) {
    return (
      <div className="p-4 h-[92vh] max-h-[92vh] bg-gray-100 flex items-center justify-center w-full">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <InfoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No conversations yet
          </h3>
          <p className="text-gray-500 mb-4">
            You haven't started any conversations. When you send or receive
            messages, they'll appear here.
          </p>
          <div className="text-sm text-gray-400">
            Start by browsing tutors and sending them a message!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[93vh] h-full bg-gray-100 flex flex-col md:flex-row gap-4 w-full relative">
      {/* Desktop Layout - User List (hidden on mobile) */}
      <div className="hidden w-[280px] lg:w-[350px] md:block">
        <UserList
          users={users}
          activeUser={activeUser}
          searchTerm={search}
          setSearchTerm={setSearch}
          onUserSelect={handleUserSelect}
          userId={userId}
        />
      </div>

      {/* Mobile/Main Content Area */}
      <div className="flex-1 grow shrink-0 h-full flex flex-col bg-white rounded-lg shadow-md relative">
        <MessagesContainer
          messages={messages}
          activeUser={activeUser}
          userId={userId}
          userRole={userRole}
          pendingMessages={pendingMessages}
          onReply={handleReply}
          onAppointmentResponse={handleAppointmentResponse}
          onOpenAppointmentModal={() => setShowAppointmentModal(true)}
          onShowSidebar={() => setShowSidebar(true)}
          onShowUserListDrawer={openDrawer}
          users={users}
          upcomingAppointments={upcomingAppointments}
        />

        <ChatInput
          ref={chatInputRef}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          activeUser={activeUser}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          messages={messages}
          onSend={handleSend}
          pendingMessages={pendingMessages}
        />
      </div>

      {/* Right Column - Desktop Sidebar */}
      <div className="hidden w-[350px] xl:block">
        <ChatSidebar
          activeUser={activeUser}
          inquiry={inquiry}
          upcomingAppointments={upcomingAppointments}
          appointmentsWithoutQuiz={appointmentsWithoutQuiz}
          userId={userId}
          userRole={userRole}
        />
      </div>

      {/* Mobile User List Drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${showUserListDrawer || isDrawerAnimating ? "block" : "hidden"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 ${
            showUserListDrawer
              ? isDrawerAnimating
                ? "animate-backdropFadeOut"
                : "animate-backdropFadeIn"
              : "animate-backdropFadeOut"
          }`}
          onClick={closeDrawer}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 h-full w-80 max-w-[80vw] bg-white z-50 shadow-2xl ${
            showUserListDrawer
              ? isDrawerAnimating
                ? "animate-slideOutLeft"
                : "animate-slideInLeft"
              : "animate-slideOutLeft"
          }`}
        >
          {/* Drawer Header */}
          <div
            className={`flex items-center justify-between p-4 border-b border-gray-200 ${
              showUserListDrawer && !isDrawerAnimating
                ? "animate-contentFadeInUp animate-stagger-1"
                : "opacity-0"
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Conversations
            </h2>
            <button
              onClick={closeDrawer}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:rotate-90"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Drawer Content */}
          <div
            className={`h-full pb-16 ${
              showUserListDrawer && !isDrawerAnimating
                ? "animate-contentFadeInUp animate-stagger-2"
                : "opacity-0"
            }`}
          >
            <UserList
              users={users}
              activeUser={activeUser}
              searchTerm={search}
              setSearchTerm={setSearch}
              onUserSelect={handleUserSelect}
              userId={userId}
              className="h-full p-4 flex flex-col overflow-y-auto"
            />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        activeUser={activeUser}
        inquiry={inquiry}
        upcomingAppointments={upcomingAppointments}
        appointmentsWithoutQuiz={appointmentsWithoutQuiz}
        userId={userId}
        userRole={userRole}
      />

      {/* Appointment Modal */}
      {showDeclineReasonModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Decline Appointment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for declining this appointment request.
            </p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="Enter your reason..."
            />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineReasonModal(false);
                  setPendingDeclineMessage(null);
                  setDeclineReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSubmitDeclineReason}
              >
                Submit Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        appointmentDate={appointmentDate}
        setAppointmentDate={setAppointmentDate}
        appointmentTime={appointmentTime}
        setAppointmentTime={setAppointmentTime}
        appointmentDurationOption={appointmentDurationOption}
        setAppointmentDurationOption={setAppointmentDurationOption}
        customDurationMinutes={customDurationMinutes}
        setCustomDurationMinutes={setCustomDurationMinutes}
        appointmentMode={appointmentMode}
        setAppointmentMode={setAppointmentMode}
        appointmentType={appointmentType}
        setAppointmentType={setAppointmentType}
        selectedRecurringDates={selectedRecurringDates}
        setSelectedRecurringDates={setSelectedRecurringDates}
        onSend={handleSendAppointment}
        currentUserAvailability={
          clerkUser?.publicMetadata
            ? userRole === "tutee"
              ? (clerkUser.publicMetadata.tuteeAvailability as any)
              : (clerkUser.publicMetadata.tutorAvailability as any)
            : undefined
        }
        otherUserAvailability={
          activeUser
            ? userRole === "tutor"
              ? activeUser.tuteeAvailability
              : activeUser.tutorAvailability
            : undefined
        }
        subjectAvailability={subjectAvailability}
        userRole={userRole}
      />
    </div>
  );
}
