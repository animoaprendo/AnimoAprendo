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
  messages: Message[];
}

export default function MessageBubble({
  message,
  userId,
  pendingMessages,
  onReply,
  onAppointmentResponse,
  userRole,
  messages
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
        {/* Reply To Message Display */}
        {message.replyTo && (
          <ReplyToMessage
            replyToId={message.replyTo}
            messages={messages}
          />
        )}
        
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
  
  return (
    <div className="space-y-3">
      <div className="font-semibold">📊 Quiz Result</div>
      <div className="text-sm space-y-1">
        <p><strong>Attempt:</strong> {quizResult.attempt}</p>
        <p><strong>Score:</strong> {quizResult.score}% ({quizResult.totalQuestions} questions)</p>
        <p><strong>Completed:</strong> {new Date(quizResult.completedAt).toLocaleDateString()}</p>
      </div>
      
      {/* View Results Button */}
      <button
        onClick={() => {
          const appointmentId = quizResult.appointmentId;
          if (appointmentId) {
            window.location.href = `/quiz?appointmentId=${appointmentId}&attempt=${quizResult.attempt}&viewResults=true`;
          } else {
            console.error('No appointment ID found for quiz result');
          }
        }}
        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 w-full hover:cursor-pointer"
        title="View detailed quiz results and answers"
      >
        View Results
      </button>
    </div>
  );
}

function ReplyToMessage({ replyToId, messages }: { replyToId: string; messages: Message[] }) {
  const repliedMessage = messages.find((msg) => getMessageId(msg) === replyToId);
  
  if (!repliedMessage) {
    return null;
  }

  // Truncate long messages for the reply preview
  const truncateMessage = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-2 border-green-500">
      <div className="text-xs opacity-70 mb-1">
        Replying to:
      </div>
      <div className="text-sm">
        {repliedMessage.type === "appointment" && repliedMessage.appointment ? (
          <span>📅 Appointment: {repliedMessage.appointment.subject}</span>
        ) : repliedMessage.type === "quiz-result" && repliedMessage.quizResult ? (
          <span>📊 Quiz Result: Attempt {repliedMessage.quizResult.attempt}</span>
        ) : (
          <span>{truncateMessage(repliedMessage.message)}</span>
        )}
      </div>
    </div>
  );
}