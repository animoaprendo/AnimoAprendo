"use client";

import {
  CornerUpLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Message, getMessageId } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MessageBubbleProps {
  message: Message;
  userId: string;
  pendingMessages: Set<string>;
  onReply: (messageId: string) => void;
  onAppointmentResponse?: (
    msg: Message,
    action: "accepted" | "declined" | "cancelled"
  ) => void;
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
  messages,
}: MessageBubbleProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = message.creatorId === userId;
  const isPending = pendingMessages.has(getMessageId(message));

  return (
    <div
      className={`flex gap-3 w-full group ${
        isOwnMessage ? "flex-row-reverse justify-start" : "flex-row"
      }`}
    >
      <Card
        className={`max-w-[75%] shadow-sm border ${
          isOwnMessage
            ? isPending
              ? "bg-green-600 text-white opacity-70 border-green-700"
              : "bg-green-600 text-white border-green-700"
            : "bg-white border-green-100"
        }`}
      >
        <CardContent className="p-4">
          {/* Reply To Message Display */}
          {message.replyTo && (
            <ReplyToMessage replyToId={message.replyTo} messages={messages} />
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
            <div className="text-sm leading-relaxed">{message.message}</div>
          )}
          <div
            className={`flex items-center gap-2 text-xs mt-3 ${
              isOwnMessage ? "text-green-100" : "text-gray-500"
            }`}
          >
            <Clock className="w-3 h-3" />
            {formatTimestamp(message.createdAt)}
            {isPending && (
              <Badge
                variant="outline"
                className="text-xs py-0 px-1 bg-yellow-100 text-yellow-800 border-yellow-300"
              >
                Sending...
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReply(getMessageId(message))}
        className="hidden text-green-600 hover:text-green-700 hover:bg-green-50 select-none group-hover:flex lg:hidden h-8 w-8 p-0"
      >
        <CornerUpLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AppointmentMessage({
  message,
  userId,
  userRole,
  onAppointmentResponse,
}: {
  message: Message;
  userId: string;
  userRole: "tutee" | "tutor";
  onAppointmentResponse?: (
    msg: Message,
    action: "accepted" | "declined" | "cancelled"
  ) => void;
}) {
  const appointment = message.appointment!;
  const date = new Date(appointment.datetimeISO);
  const isCreator = message.creatorId === userId;
  const canRespond = !isCreator && appointment.status === "pending";
  const canCancel = isCreator && appointment.status !== "cancelled";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-900" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "declined":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-semibold text-green-900">
        <Calendar className="w-5 h-5" />
        Appointment Request
      </div>

      <div className="space-y-3">
        {/* {appointment.subject && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Subject:</span>
            <span>{appointment.subject}</span>
          </div>
        )} */}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">Date:</span>
          <span>{date.toLocaleDateString()}</span>
          {appointment.appointmentType === "recurring" &&
            appointment.endDate && (
              <span>
                - {new Date(appointment.endDate).toLocaleDateString()}
              </span>
            )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Time:</span>
          <span>
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">Mode:</span>
          <Badge variant="outline" className="capitalize text-xs">
            {appointment.mode}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {getStatusIcon(appointment.status)}
          <span className="font-medium">Status:</span>
          <Badge className={`${getStatusColor(appointment.status)} text-xs`}>
            {appointment.status.charAt(0).toUpperCase() +
              appointment.status.slice(1)}
          </Badge>
        </div>
      </div>

      {(canRespond || canCancel) && (
        <>
          <Separator className="my-3" />
          <div className="flex gap-2">
            {canRespond && onAppointmentResponse && (
              <>
                <Button
                  onClick={() => onAppointmentResponse(message, "accepted")}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  size="sm"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => onAppointmentResponse(message, "declined")}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </>
            )}

            {canCancel &&
              onAppointmentResponse &&
              appointment.status === "pending" && (
                <Button
                  onClick={() => onAppointmentResponse(message, "cancelled")}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
          </div>
        </>
      )}
    </div>
  );
}

function QuizResultMessage({ message }: { message: Message }) {
  const quizResult = message.quizResult!;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-semibold text-blue-700">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          📊
        </div>
        Quiz Result
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Attempt:</span>
          <Badge variant="outline" className="text-xs">
            {quizResult.attempt === 1 ? "Pre-session" : "Post-session"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Score:</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getScoreColor(quizResult.score)}`}>
              {quizResult.score}%
            </span>
            <span className="text-xs text-gray-500">
              ({quizResult.totalQuestions} questions)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Completed:</span>
          <span className="text-sm text-gray-600">
            {new Date(quizResult.completedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Separator />

      <Button
        onClick={() => {
          const appointmentId = quizResult.appointmentId;
          if (appointmentId) {
            window.location.href = `/quiz?appointmentId=${appointmentId}&attempt=${quizResult.attempt}&viewResults=true`;
          } else {
            console.error("No appointment ID found for quiz result");
          }
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        size="sm"
      >
        View Detailed Results
      </Button>
    </div>
  );
}

function ReplyToMessage({
  replyToId,
  messages,
}: {
  replyToId: string;
  messages: Message[];
}) {
  const repliedMessage = messages.find(
    (msg) => getMessageId(msg) === replyToId
  );

  if (!repliedMessage) {
    return null;
  }

  // Truncate long messages for the reply preview
  const truncateMessage = (text: string, maxLength: number = 50) => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <Card className="mb-3 bg-green-50 border-l-4 border-l-green-500 border-green-100">
      <CardContent className="p-3">
        <div className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
          <CornerUpLeft className="w-3 h-3" />
          Replying to:
        </div>
        <div className="text-sm text-green-800">
          {repliedMessage.type === "appointment" &&
          repliedMessage.appointment ? (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                Appointment:{" "}
                {repliedMessage.appointment.subject || "Tutoring Session"}
              </span>
            </div>
          ) : repliedMessage.type === "quiz-result" &&
            repliedMessage.quizResult ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 flex items-center justify-center text-xs">
                📊
              </div>
              <span>
                Quiz Result: Attempt {repliedMessage.quizResult.attempt}
              </span>
            </div>
          ) : (
            <span className="italic">
              {truncateMessage(repliedMessage.message)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
