"use server";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getTutorQuestionBank, mergeDuplicateQuestionBankEntries } from "@/lib/question-bank";
import { getSubjectSortingWeights } from "@/lib/subject-sorting-settings";
import type { SortingWeights } from "@/lib/subject-sorting";

const daysOfWeek = [
  { name: "M", value: "monday" },
  { name: "T", value: "tuesday" },
  { name: "W", value: "wednesday" },
  { name: "Th", value: "thursday" },
  { name: "F", value: "friday" },
  { name: "S", value: "saturday" },
  { name: "Su", value: "sunday" },
];

type TimeOfDay = {
  hourOfDay: number;
  minute: number;
};

type TimeRange = {
  id: string;
  timeStart: TimeOfDay;
  timeEnd: TimeOfDay;
};

type AvailabilitySlot = {
  day: (typeof daysOfWeek)[number]["value"];
  timeRanges: TimeRange[];
};

export type onboardingData = {
  accountType: string;
  studentRole?: string;
  college?: string;
  department?: string;
  section?: number;
  yearLevel?: number;
  availability?: AvailabilitySlot[];
};

export type Collections = "users" | "colleges" | "userData" | "faq" | "subjects" | "offerings" | "reviews" | "appointments" | "subjectOptions";

export async function finishOnboarding({
  accountType = "student",
  studentRole,
  college,
  department,
  section,
  yearLevel,
  availability
}: onboardingData) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const resolvedRole = accountType === "teacher" ? "tutor" : (studentRole || "tutee");
  const normalizedAvailability = Array.isArray(availability) ? availability : [];

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/onboarding`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        accountType,
        role: resolvedRole,
        college,
        department,
        yearLevel,
        section,
        tuteeAvailability: normalizedAvailability,
        tutorAvailability: normalizedAvailability,
      }),
    }
  );

  const data = await response.json();
  if (data.success) {
    return { success: true };
  }

  console.error("Error updating publicMetadata:", data.error);
  return { success: false, error: "Failed to update metadata" };
}

export async function updateMetadata({
  userId,
  role,
}: {
  userId: string | undefined;
  role: string;
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateMetadata`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, role }),
    }
  );

  const data = await response.json();
  if (data.success) {
    return { success: true };
  } else {
    console.error("Error updating publicMetadata:", data.error);
    return { success: false, error: "Failed to update metadata" };
  }
}

export async function getCollectionData(collection: Collections) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/getData?collection=${collection}`,
    { method: "GET" }
  );

  const data = await response.json();
  if (data.success) {
    return data
  }
}

export async function createCollectionData(collection: Collections, data: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/createData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collection,
        data,
      }),
    });

    const result = await response.json();
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || "Failed to create data");
    }
  } catch (error) {
    console.error("Error creating collection data:", error);
    throw error;
  }
}

export async function updateCollectionData(collection: Collections, id: string, data: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collection,
        id,
        data,
      }),
    });

    const result = await response.json();
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || "Failed to update data");
    }
  } catch (error) {
    console.error("Error updating collection data:", error);
    throw error;
  }
}

export async function deleteCollectionData(collection: Collections, id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/deleteData`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collection,
        id,
      }),
    });

    const result = await response.json();
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || "Failed to delete data");
    }
  } catch (error) {
    console.error("Error deleting collection data:", error);
    throw error;
  }
}

// Create inquiry when tutee starts chat with tutor
export async function createInquiry(inquiryData: {
  tuteeId: string;
  tutorId: string;
  offeringId: string;
}) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/createInquiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inquiryData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return { success: false, error: "Failed to create inquiry" };
  }
}

// Get inquiry between tutee and tutor
export async function getInquiry(tuteeId: string, tutorId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getInquiry?tuteeId=${tuteeId}&tutorId=${tutorId}`,
      { method: "GET" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    return { success: false, error: "Failed to fetch inquiry" };
  }
}

// Get inquiry by specific offering ID
export async function getInquiryByOffering(tuteeId: string, tutorId: string, offeringId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getInquiry?tuteeId=${tuteeId}&tutorId=${tutorId}&offeringId=${offeringId}`,
      { method: "GET" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching inquiry by offering:", error);
    return { success: false, error: "Failed to fetch inquiry" };
  }
}

export async function getOfferingById(offeringId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getOffering?id=${offeringId}`,
      { method: "GET" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching offering:", error);
    return { success: false, error: "Failed to fetch offering" };
  }
}

export async function getReviewsByOfferingId(offeringId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getReviews?offeringId=${offeringId}`,
      { method: "GET" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { success: false, error: "Failed to fetch reviews" };
  }
}

export async function getAllOfferings() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getAllOfferings?t=${Date.now()}`,
      { 
        method: "GET",
        cache: "no-cache"
      }
    );

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching offerings:", error);
    return { success: false, error: "Failed to fetch offerings" };
  }
}

// Chat-related server actions
export async function fetchChats(userId: string, role: 'tutee' | 'tutor'): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/chat?userId=${userId}&role=${role}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error('Server action: Chat API response not ok:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error fetching chats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchUsers(userIds: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/users?userIds=${userIds.join(',')}`;
    
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      console.error('Server action: Users API response not ok:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Server action: Error response body:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error fetching users:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendMessage(messageData: {
  creatorId: string;
  message: string;
  recipients: string[];
  replyTo: string | null;
  senderRole: 'tutee' | 'tutor';
  type?: 'text' | 'appointment' | 'quiz-result';
  appointment?: {
    appointmentType?: 'single' | 'recurring';
    endDate?: string;
    selectedDates?: string[];
    startDate: string;
    datetimeISO: string;
    durationMinutes?: number;
    mode: 'online' | 'in-person';
    status?: 'pending' | 'accepted' | 'declined';
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
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
      console.error('Server action: Send message API response not ok:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error sending message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Migrate old messages to mark them as seen
export async function migrateSeenMessages(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/migrateSeen`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      console.error('Server action: Migration API response not ok:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Migration API error response:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error migrating messages:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Mark messages as seen for a specific conversation
export async function markMessagesAsSeen(userId: string, conversationUserId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/markSeen`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, conversationUserId }),
      }
    );

    if (!response.ok) {
      console.error('Server action: Mark seen API response not ok:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error marking messages as seen:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Update appointment status for an existing chat message
export async function updateAppointmentStatus(params: {
  messageId: string;
  status: 'accepted' | 'declined' | 'cancelled';
  actorId: string;
  declineReason?: string;
  meetingUrl?: string;
  meetingId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error updating appointment status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Update appointment collection status (for marking as completed)
export async function updateAppointmentCollectionStatus(params: {
  messageId: string;
  status: 'completed';
  userId: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error updating appointment collection status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Cancel appointment (Admin action)
export async function cancelAppointment(params: {
  messageId: string;
  appointmentId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: params.messageId || params.appointmentId,
          status: 'cancelled',
          userId: process.env.ADMIN_KEY // Admin override
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error cancelling appointment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Submit quiz attempt for tutee
export async function submitQuizAttempt(params: {
  messageId: string;
  quizAttempt: {
    attempt: 1 | 2;
    answers: { questionId: string; answer: string; isCorrect?: boolean }[];
    score: number;
    completedAt: string;
    tuteeId: string;
    totalQuestions?: number;
    tutorId?: string;
  };
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    
    // Send quiz result message to chat if we have the necessary info
    if (params.quizAttempt.tutorId && params.quizAttempt.totalQuestions) {
      try {
        await sendMessage({
          creatorId: params.quizAttempt.tuteeId,
          message: `Quiz completed with ${params.quizAttempt.score}% score`,
          recipients: [params.quizAttempt.tuteeId, params.quizAttempt.tutorId],
          replyTo: null,
          senderRole: 'tutee',
          type: 'quiz-result',
          quizResult: {
            appointmentId: params.messageId,
            attempt: params.quizAttempt.attempt,
            score: params.quizAttempt.score,
            totalQuestions: params.quizAttempt.totalQuestions,
            completedAt: params.quizAttempt.completedAt,
            tuteeId: params.quizAttempt.tuteeId
          }
        });
      } catch (messageError) {
        console.error('Error sending quiz result message:', messageError);
        // Don't fail the quiz submission if message sending fails
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Server action: Error submitting quiz attempt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Tutor override for quiz attempt correctness
export async function updateQuizAttemptCorrectness(params: {
  messageId: string;
  attempt: 1 | 2;
  answers: { questionId: string; isCorrect: boolean }[];
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          tutorId: userId,
          quizAttemptCorrection: true,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Server action: Error updating quiz attempt correctness:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Question type for appointments
export type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

// Fetch appointments for a user
export async function fetchAppointments(userId?: string, messageId?: string): Promise<{ success: boolean; appointments?: any[]; error?: string }> {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "User ID is required" };
    }

    const params = new URLSearchParams({ userId: targetUserId });
    if (messageId) {
      params.append('messageId', messageId);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments?${params}`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, appointments: data.appointments };
  } catch (error) {
    console.error('Server action: Error fetching appointments:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Update quiz for an appointment
export async function updateAppointmentQuiz(params: {
  messageId: string;
  quiz: Question[];
}): Promise<{ success: boolean; appointment?: any; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/appointments`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, userId }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, appointment: data.appointment };
  } catch (error) {
    console.error('Server action: Error updating appointment quiz:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchTutorQuestionBank(params: {
  subjectOfferingId?: string;
  subjectName?: string;
  limit?: number;
  includeArchived?: boolean;
}): Promise<{ success: boolean; entries?: any[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Call the library function directly instead of making an HTTP request
    // This avoids auth context loss when fetch() is made from server action
    const client = await clientPromise;
    const db = client.db("main");

    const entries = await getTutorQuestionBank({
      db,
      tutorId: userId,
      subjectOfferingId: params.subjectOfferingId,
      subjectName: params.subjectName,
      limit: params.limit || 50,
      includeArchived: params.includeArchived || false,
    });

    console.log("[fetchTutorQuestionBank] Entries retrieved:", {
      tutorId: userId,
      subjectOfferingId: params.subjectOfferingId,
      subjectName: params.subjectName,
      count: entries.length,
    });

    return { success: true, entries };
  } catch (error) {
    console.error("Server action: Error fetching tutor question bank:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateTutorQuestionBankEntry(params: {
  entryId: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Call MongoDB directly instead of making an HTTP request
    // This avoids auth context loss when fetch() is made from server action
    const client = await clientPromise;
    const db = client.db("main");
    const collection = db.collection("quizQuestionBank");

    const setPayload: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof params.isFavorite === "boolean") {
      setPayload.isFavorite = params.isFavorite;
    }
    if (typeof params.isArchived === "boolean") {
      setPayload.isArchived = params.isArchived;
    }

    if (Object.keys(setPayload).length === 1) {
      return { success: false, error: "No update fields provided" };
    }

    const updated = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(params.entryId),
        tutorId: userId,
      },
      {
        $set: setPayload,
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return { success: false, error: "Entry not found" };
    }

    console.log("[updateTutorQuestionBankEntry] Entry updated:", {
      entryId: params.entryId,
      tutorId: userId,
      isFavorite: params.isFavorite,
      isArchived: params.isArchived,
    });

    return { success: true, entry: updated };
  } catch (error) {
    console.error("Server action: Error updating question bank entry:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function cleanupTutorQuestionBankDuplicates(params: {
  subjectOfferingId?: string;
  subjectName?: string;
}): Promise<{ success: boolean; result?: { groupsMerged: number; duplicatesRemoved: number }; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Call the library function directly instead of making an HTTP request
    // This avoids auth context loss when fetch() is made from server action
    const client = await clientPromise;
    const db = client.db("main");

    const result = await mergeDuplicateQuestionBankEntries({
      db,
      tutorId: userId,
      subjectOfferingId: params.subjectOfferingId || null,
      subjectName: params.subjectName || null,
    });

    console.log("[cleanupTutorQuestionBankDuplicates] Cleanup completed:", {
      tutorId: userId,
      subjectOfferingId: params.subjectOfferingId,
      subjectName: params.subjectName,
      groupsMerged: result.groupsMerged,
      duplicatesRemoved: result.duplicatesRemoved,
    });

    return { success: true, result };
  } catch (error) {
    console.error("Server action: Error cleaning up question bank duplicates:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Create a review for an appointment
export async function createReview(params: {
  appointmentId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; review?: any; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          appointmentId: params.appointmentId,
          rating: params.rating,
          comment: params.comment,
          reviewerId: userId
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, review: data.review };
  } catch (error) {
    console.error('Server action: Error creating review:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Fetch tutor history with appointments and reviews
export async function fetchTutorHistory(userId?: string): Promise<{ 
  success: boolean; 
  history?: any[]; 
  statistics?: {
    total: number;
    completed: number;
    pending: number;
    averageRating: number;
  };
  error?: string;
}> {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "User ID is required" };
    }

    // Fetch appointments where user is tutor
    const appointmentsResponse = await fetchAppointments(targetUserId);
    
    if (!appointmentsResponse.success || !appointmentsResponse.appointments) {
      return { success: false, error: appointmentsResponse.error || "Failed to fetch appointments" };
    }

    // Filter for appointments where user is tutor
    const tutorAppointments = appointmentsResponse.appointments.filter(
      apt => apt.tutorId === targetUserId
    );

    // Get unique tutee IDs
    const tuteeIds = [...new Set(tutorAppointments.map(apt => apt.tuteeId))].filter(Boolean);

    // Fetch users to get tutee names
    let users: any[] = [];
    if (tuteeIds.length > 0) {
      const usersResponse = await fetchUsers(tuteeIds);
      
      if (!usersResponse.success || !usersResponse.data?.users) {
        return { success: false, error: "Failed to fetch user data" };
      }

      users = usersResponse.data.users;
    }

    // Transform appointments to history format
    const history = tutorAppointments.map(appointment => {
      const tutee = users.find((user: any) => user.id === appointment.tuteeId);
      const tuteeName = tutee ? `${tutee.firstName} ${tutee.lastName}`.trim() : 'Unknown Tutee';
      
      // Format date
      const appointmentDate = new Date(appointment.scheduledDate || appointment.createdAt);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        id: appointment._id,
        appointmentId: appointment._id,
        Tutee: tuteeName,
        TuteeId: tutee?.id || appointment.tuteeId,
        Date: formattedDate,
        Duration: "1 Hour", // Default duration
        Mode: appointment.mode || "Online",
        Subject: appointment.subject || "No Subject",
        Status: appointment.status === 'completed' ? 'Completed' : 'Pending',
        TutorRated: appointment.tutorRated || false,
        TuteeRating: appointment.tuteeRating || undefined,
        rawDate: appointment.scheduledDate || appointment.createdAt
      };
    });

    // Calculate statistics
    const totalSessions = history.length;
    const completedSessions = history.filter(h => h.Status === 'Completed').length;
    const pendingSessions = history.filter(h => h.Status === 'Pending').length;
    
    const ratedSessions = history.filter(h => h.TutorRated && h.TuteeRating);
    const averageRating = ratedSessions.length > 0
      ? ratedSessions.reduce((sum, h) => sum + (h.TuteeRating || 0), 0) / ratedSessions.length
      : 0;

    return {
      success: true,
      history: history.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()),
      statistics: {
        total: totalSessions,
        completed: completedSessions,
        pending: pendingSessions,
        averageRating: Math.round(averageRating * 100) / 100
      }
    };

  } catch (error) {
    console.error('Server action: Error fetching tutor history:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Fetch tutee appointments for calendar view
export async function fetchTuteeAppointments(userId?: string): Promise<{ 
  success: boolean; 
  appointments?: any[]; 
  error?: string;
}> {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "User ID is required" };
    }

    // Fetch appointments where user is tutee
    const appointmentsResponse = await fetchAppointments(targetUserId);
    
    if (!appointmentsResponse.success || !appointmentsResponse.appointments) {
      return { success: false, error: appointmentsResponse.error || "Failed to fetch appointments" };
    }

    // Filter for appointments where user is tutee
    const tuteeAppointments = appointmentsResponse.appointments.filter(
      apt => apt.tuteeId === targetUserId
    );

    // Get unique tutor IDs
    const tutorIds = [...new Set(tuteeAppointments.map(apt => apt.tutorId))].filter(Boolean);

    // Fetch users to get tutor names
    let users: any[] = [];
    if (tutorIds.length > 0) {
      const usersResponse = await fetchUsers(tutorIds);
      
      if (!usersResponse.success || !usersResponse.data?.users) {
        return { success: false, error: "Failed to fetch user data" };
      }

      users = usersResponse.data.users;
    }

    // Transform appointments to calendar event format
    const events = tuteeAppointments.map(appointment => {
      const tutor = users.find((user: any) => user.id === appointment.tutorId);
      const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}`.trim() : 'Unknown Tutor';
      
      // Calculate start and end times
      const startDate = new Date(appointment.scheduledDate || appointment.createdAt);
      const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // Add 1 hour

      return {
        id: appointment._id,
        appointmentId: appointment._id,
        title: `${appointment.subject || 'Tutoring'} with ${tutorName}`,
        start: startDate,
        end: endDate,
        tutorName,
        tutorId: tutor?.id || appointment.tutorId,
        subject: appointment.subject || "No Subject",
        mode: appointment.mode || "Online",
        status: appointment.status || "active",
        meetingUrl: appointment.meetingUrl || null,
        meetingId: appointment.meetingId || appointment.messageId || appointment._id || null,
        resource: appointment
      };
    });

    return {
      success: true,
      appointments: events.sort((a, b) => a.start.getTime() - b.start.getTime())
    };

  } catch (error) {
    console.error('Server action: Error fetching tutee appointments:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Fetch tutee history with appointments and reviews
export async function fetchTuteeHistory(userId?: string): Promise<{ 
  success: boolean; 
  history?: any[]; 
  statistics?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  error?: string;
}> {
  try {
    const { userId: authUserId } = await auth();
    const targetUserId = userId || authUserId;
    
    if (!targetUserId) {
      return { success: false, error: "User ID is required" };
    }

    // Fetch appointments where user is tutee
    const appointmentsResponse = await fetchAppointments(targetUserId);
    
    if (!appointmentsResponse.success || !appointmentsResponse.appointments) {
      return { success: false, error: appointmentsResponse.error || "Failed to fetch appointments" };
    }

    // Filter for appointments where user is tutee
    const tuteeAppointments = appointmentsResponse.appointments.filter(
      apt => apt.tuteeId === targetUserId
    );

    // Get unique tutor IDs
    const tutorIds = [...new Set(tuteeAppointments.map(apt => apt.tutorId))].filter(Boolean);

    // Fetch users to get tutor names
    let users: any[] = [];
    if (tutorIds.length > 0) {
      const usersResponse = await fetchUsers(tutorIds);
      
      if (!usersResponse.success || !usersResponse.data?.users) {
        return { success: false, error: "Failed to fetch user data" };
      }

      users = usersResponse.data.users;
    }

    // Transform appointments to history format
    const history = tuteeAppointments.map(appointment => {
      const tutor = users.find((user: any) => user.id === appointment.tutorId);
      const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}`.trim() : 'Unknown Tutor';
      
      // Format date
      const appointmentDate = new Date(appointment.scheduledDate || appointment.createdAt);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        id: appointment._id,
        appointmentId: appointment._id,
        tutor: tutorName,
        tutorId: tutor?.id || appointment.tutorId,
        date: formattedDate,
        duration: "1 Hour", // Default duration
        mode: appointment.mode || "Online",
        subject: appointment.subject || "No Subject",
        status: appointment.status === 'completed' ? 'Completed' : 
                appointment.status === 'cancelled' ? 'Cancelled' : 'Pending',
        meetingUrl: appointment.meetingUrl || null,
        meetingId: appointment.meetingId || null,
        rated: appointment.tuteeRated || false,
        ratings: appointment.tuteeRating ? {
          experience: appointment.tuteeRating,
          learning: appointment.tuteeRating,
          communication: appointment.tuteeRating,
          comment: appointment.tuteeComment || undefined
        } : undefined,
        rawDate: appointment.scheduledDate || appointment.createdAt
      };
    });

    // Calculate statistics
    const totalSessions = history.length;
    const completedSessions = history.filter(h => h.status === 'Completed').length;
    const pendingSessions = history.filter(h => h.status === 'Pending').length;
    const cancelledSessions = history.filter(h => h.status === 'Cancelled').length;

    return {
      success: true,
      history: history.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()),
      statistics: {
        total: totalSessions,
        completed: completedSessions,
        pending: pendingSessions,
        cancelled: cancelledSessions
      }
    };

  } catch (error) {
    console.error('Server action: Error fetching tutee history:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Search offerings with filters
export async function searchOfferings(params: {
  query?: string;
  sortBy?: string;
  day?: string;
  rating?: string;
  tuteeYearLevel?: number;
  tuteeAvailability?: Array<{
    day: string;
    timeRanges: Array<{
      id?: string;
      timeStart: {
        hourOfDay: number;
        minute: number;
      };
      timeEnd: {
        hourOfDay: number;
        minute: number;
      };
    }>;
  }>;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { query, sortBy, day, rating, tuteeAvailability, tuteeYearLevel } = params;
    const sortingWeights = await getSubjectSortingWeights();
    
    // Get all offerings first
    const offeringsResponse = await getAllOfferings();
    
    if (!offeringsResponse.success || !offeringsResponse.data) {
      return { success: false, error: "Failed to fetch offerings" };
    }

    let filtered = [...offeringsResponse.data];

    // Filter by search query (subject name or tutor name)
    if (query && query.trim() !== "") {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (offering) =>
          offering.subject?.toLowerCase().includes(lowerQuery) ||
          offering.title?.toLowerCase().includes(lowerQuery) ||
          offering.user?.displayName?.toLowerCase().includes(lowerQuery) ||
          offering.user?.firstName?.toLowerCase().includes(lowerQuery) ||
          offering.user?.lastName?.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by day availability
    if (day && day.trim() !== "") {
      filtered = filtered.filter((offering) =>
        offering.availability?.some(
          (a: any) => a.day?.toLowerCase() === day.toLowerCase()
        )
      );
    }

    // Filter by minimum rating
    if (rating && rating.trim() !== "") {
      const minRating = parseFloat(rating);
      filtered = filtered.filter((offering) => {
        // Calculate average rating from reviews if available
        const avgRating = offering.averageRating || 0;
        return avgRating >= minRating;
      });
    }

    // Sort results
    if (sortBy) {
      switch (sortBy) {
        case "weighted":
          // Use weighted algorithm for smart sorting
          const { sortOfferingsByScore } = await import('@/lib/subject-sorting');
          filtered = sortOfferingsByScore(filtered, sortingWeights, { tuteeAvailability, tuteeYearLevel });
          break;
        case "highest-rated":
          filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
          break;
        case "most-recent":
          filtered.sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          break;
        default:
          // Default to weighted sorting for best results
          const { sortOfferingsByScore: sortDefault } = await import('@/lib/subject-sorting');
          filtered = sortDefault(filtered, sortingWeights, { tuteeAvailability, tuteeYearLevel });
      }
    } else {
      // No sortBy specified, use weighted as default
      const { sortOfferingsByScore: sortDefault } = await import('@/lib/subject-sorting');
      filtered = sortDefault(filtered, sortingWeights, { tuteeAvailability, tuteeYearLevel });
    }

    return { success: true, data: filtered };

  } catch (error) {
    console.error('Server action: Error searching offerings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getEffectiveSubjectSortingWeights(): Promise<{
  success: boolean;
  weights?: SortingWeights;
  error?: string;
}> {
  try {
    const weights = await getSubjectSortingWeights();
    return { success: true, weights };
  } catch (error) {
    console.error("Server action: Error loading effective subject sorting weights:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}