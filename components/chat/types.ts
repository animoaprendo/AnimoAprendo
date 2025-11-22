export interface Message {
  _id: { $oid: string } | string;
  creatorId: string;
  message: string;
  createdAt: string;
  replyTo: string | null;
  recipients: string[];
  senderRole: "tutee" | "tutor";
  type?: "text" | "appointment" | "quiz-result";
  seenBy?: string[]; // Array of user IDs who have seen this message
  appointment?: {
    appointmentType?: "single" | "recurring";
    endDate?: string;
    startDate?: string;
    datetimeISO: string;
    mode: "online" | "in-person";
    status: "pending" | "accepted" | "declined" | "cancelled";
    subject?: string;
    offeringId?: string;
  };
  quizResult?: {
    appointmentId: string;
    attempt: 1 | 2;
    score: number;
    totalQuestions: number;
    completedAt: string;
    tuteeId: string;
  };
}

export interface User {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime?: string; // ISO timestamp of the last message
  lastMessageCreatorId?: string; // ID of who sent the last message
  unreadCount: number;
  isTyping?: boolean;
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
}

export interface Inquiry {
  _id: string;
  tuteeId: string;
  tutorId: string;
  offeringId: string;
  subject: string;
  banner: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
  displayName: string;
}

// Helper function to get message ID in consistent format
export const getMessageId = (message: Message): string => {
  if (typeof message._id === "string") {
    return message._id;
  }
  if (message._id && typeof message._id === "object" && "$oid" in message._id) {
    return message._id.$oid;
  }
  // Fallback for any other format
  return String(message._id || "");
};