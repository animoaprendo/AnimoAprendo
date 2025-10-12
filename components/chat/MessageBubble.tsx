"use client";

import { CornerUpLeft } from "lucide-react";
import { Message, getMessageId } from "./types";

interface MessageBubbleProps {
  message: Message;
  userId: string;
  pendingMessages: Set<string>;
  onReply: (messageId: string) => void;
  onAppointmentResponse?: (msg: Message, action: "accepted" | "declined" | "cancelled") => void;
  userRole: "tutee" | "tutor";
}

export default function MessageBubble({
  message,
  userId,
  pendingMessages,
  onReply,
  onAppointmentResponse,
  userRole
}: MessageBubbleProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = message.creatorId === userId;
  const isPending = pendingMessages.has(getMessageId(message));

  return (
    <div
      className={`flex gap-2 w-full group ${
        isOwnMessage ? "flex-row-reverse ml-auto" : "flex-row"
      }`}
    >
      <div
        className={`max-w-9/12 p-3 rounded-2xl relative z-0 ${
          isOwnMessage
            ? isPending
              ? "bg-green-600 text-white opacity-70"
              : "bg-green-700 text-white"
            : "bg-green-50 text-green-900"
        }`}
      >
        {message.type === "appointment" && message.appointment ? (
          <AppointmentMessage
            message={message}
            userId={userId}
            userRole={userRole}
            onAppointmentResponse={onAppointmentResponse}
          />
        ) : message.type === "quiz-result" && message.quizResult ? (
          <QuizResultMessage message={message} />
        ) : (
          <div>{message.message}</div>
        )}
        <span className="flex items-center gap-1 text-[10px] mt-1 opacity-70">
          {formatTimestamp(message.createdAt)}
          {isPending && (
            <span className="text-yellow-200">● Sending...</span>
          )}
        </span>
      </div>
      <button
        onClick={() => onReply(getMessageId(message))}
        className="hidden text-sm mt-1 text-green-800 hover:underline select-none hover:cursor-pointer group-hover:block lg:hidden"
      >
        <CornerUpLeft className="inline w-4 h-4 mr-1 stroke-3" />
      </button>
    </div>
  );
}

function AppointmentMessage({
  message,
  userId,
  userRole,
  onAppointmentResponse
}: {
  message: Message;
  userId: string;
  userRole: "tutee" | "tutor";
  onAppointmentResponse?: (msg: Message, action: "accepted" | "declined" | "cancelled") => void;
}) {
  const appointment = message.appointment!;
  const date = new Date(appointment.datetimeISO);
  const isCreator = message.creatorId === userId;
  const canRespond = !isCreator && appointment.status === "pending";
  const canCancel = isCreator && appointment.status !== "cancelled";

  return (
    <div className="space-y-2">
      <div className="font-semibold">📅 Appointment Request</div>
      <div className="text-sm space-y-1">
        <p><strong>Subject:</strong> {appointment.subject}</p>
        <p><strong>Date:</strong> {date.toLocaleDateString()}</p>
        <p><strong>Time:</strong> {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        <p className="capitalize"><strong>Mode:</strong> {appointment.mode}</p>
        <p className={`font-medium`}>
          <strong>Status:</strong> {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </p>
      </div>
      
      {canRespond && onAppointmentResponse && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAppointmentResponse(message, "accepted")}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Accept
          </button>
          <button
            onClick={() => onAppointmentResponse(message, "declined")}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Decline
          </button>
        </div>
      )}
      
      {canCancel && onAppointmentResponse && appointment.status === "pending" && (
        <div className="mt-3">
          <button
            onClick={() => onAppointmentResponse(message, "cancelled")}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function QuizResultMessage({ message }: { message: Message }) {
  const quizResult = message.quizResult!;
  const percentage = Math.round((quizResult.score / quizResult.totalQuestions) * 100);
  
  return (
    <div className="space-y-2">
      <div className="font-semibold">📊 Quiz Result</div>
      <div className="text-sm space-y-1">
        <p><strong>Attempt:</strong> {quizResult.attempt}</p>
        <p><strong>Score:</strong> {quizResult.score}/{quizResult.totalQuestions} ({percentage}%)</p>
        <p><strong>Completed:</strong> {new Date(quizResult.completedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}