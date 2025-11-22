"use client";

import { User, Inquiry } from "./types";
import { updateAppointmentCollectionStatus } from "@/app/actions";

interface ChatSidebarProps {
  activeUser: User | null;
  inquiry: Inquiry | null;
  upcomingAppointments: any[];
  appointmentsWithoutQuiz: any[];
  userId: string;
  userRole: "tutee" | "tutor";
}

export default function ChatSidebar({
  activeUser,
  inquiry,
  upcomingAppointments,
  appointmentsWithoutQuiz,
  userId,
  userRole,
}: ChatSidebarProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 col-span-1 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <UserInformation activeUser={activeUser} />
      </div>
      <div className="flex-shrink-0 mt-4">
        <InquiryInformation inquiry={inquiry} />
      </div>
      <div className="flex-1 mt-4 min-h-0">
        <RemindersSection
          upcomingAppointments={upcomingAppointments}
          appointmentsWithoutQuiz={appointmentsWithoutQuiz}
          userId={userId}
          userRole={userRole}
        />
      </div>
    </div>
  );
}

function UserInformation({ activeUser }: { activeUser: User | null }) {
  return (
    <div>
      <h4 className="font-semibold text-green-900 text-sm mb-3">
        User Information
      </h4>
      {activeUser ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {activeUser.imageUrl ? (
                <img
                  src={activeUser.imageUrl}
                  alt={activeUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-green-700 font-semibold text-sm">
                  {activeUser.firstName?.charAt(0) || activeUser.name.charAt(0)}
                  {activeUser.lastName?.charAt(0) || ""}
                </span>
              )}
            </div>
            <div>
              <h5 className="font-medium text-gray-900">{activeUser.name}</h5>
              {activeUser.username && (
                <p className="text-xs text-gray-500">@{activeUser.username}</p>
              )}
            </div>
          </div>
          {activeUser.firstName && activeUser.lastName && (
            <p className="text-sm text-gray-600">
              Name:{" "}
              <span className="font-medium text-gray-800">
                {activeUser.firstName} {activeUser.lastName}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Select a conversation to view user information
        </p>
      )}
    </div>
  );
}

function InquiryInformation({ inquiry }: { inquiry: Inquiry | null }) {
  return (
    <div>
      <h4 className="font-semibold text-green-900 text-sm mb-2">Inquiry</h4>
      {inquiry ? (
        <div className="w-full bg-white rounded-xl shadow-lg transition-transform flex flex-col">
          <div className="relative">
            <img
              src={inquiry.banner}
              alt={inquiry.subject}
              className="w-full h-24 object-cover rounded-t-xl"
            />
          </div>
          <div className="flex flex-col gap-2 p-4">
            <h2 className="font-bold text-lg text-green-900">
              {inquiry.subject}
            </h2>
            <div
              className="text-xs text-gray-600 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: inquiry.description }}
            />
            <div className="flex items-center justify-between mt-2 capitalize">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  inquiry.status === "active"
                    ? "bg-green-100 text-green-800"
                    : inquiry.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {inquiry.status}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">
            No inquiry information available
          </p>
        </div>
      )}
    </div>
  );
}

function RemindersSection({
  upcomingAppointments,
  appointmentsWithoutQuiz,
  userId,
  userRole,
}: {
  upcomingAppointments: any[];
  appointmentsWithoutQuiz: any[];
  userId: string;
  userRole: "tutee" | "tutor";
}) {
  const appointmentsWithQuizzes = upcomingAppointments.filter(
    (apt: any) => apt.quiz && apt.quiz.length > 0
  );

  const hasReminders =
    appointmentsWithoutQuiz.length > 0 || upcomingAppointments.length > 0;

  return (
    <div className="h-full flex flex-col">
      <h4 className="font-semibold text-green-900 text-sm mb-2 flex-shrink-0">
        Reminders
      </h4>
      {hasReminders ? (
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Quiz Reminders Card */}
          {appointmentsWithQuizzes.length > 0 && (
            <div className="bg-blue-600 text-white/95 px-3 py-4 rounded-md">
              <div className="font-medium text-blue-100 mb-2">
                📝 Quiz Reminders
              </div>
              <div className="space-y-3">
                {appointmentsWithQuizzes.map((apt: any, index: number) => (
                  <QuizReminder
                    key={`quiz-${apt._id || index}`}
                    appointment={apt}
                    userId={userId}
                    userRole={userRole}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missing Quiz Content Card */}
          {appointmentsWithoutQuiz.length > 0 && (
            <div className="bg-yellow-600 text-white/95 px-3 py-4 rounded-md">
              <div className="font-medium text-yellow-100 mb-2">
                ⚠️ Missing Quiz Content
              </div>
              <div className="space-y-3">
                {appointmentsWithoutQuiz.map(
                  (appointment: any, index: number) => (
                    <div
                      key={appointment._id || `no-quiz-${index}`}
                      className="flex flex-col gap-2"
                    >
                      <div className="text-xs opacity-90">
                        {appointment.subject || "Appointment"} on{" "}
                        {new Date(appointment.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs opacity-75">
                        {appointment.time} - Add quiz questions for this
                        appointment
                      </div>
                      <button
                        onClick={() =>
                          (window.location.href = `/tutor/quiz/edit?appointmentId=${appointment.messageId}`)
                        }
                        className="mt-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 text-sm font-medium rounded-lg transition-colors duration-200 hover:cursor-pointer"
                      >
                        Create Quiz
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Regular Appointment Reminders Card - Show ALL appointments */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-green-700 text-white/95 px-3 py-4 rounded-md flex-shrink-0">
              <div className="font-medium text-green-100 mb-2">
                📅 Appointment Reminders
              </div>
              <div className="space-y-3">
                {upcomingAppointments
                  .slice(0, 3)
                  .map((apt: any, index: number) => (
                    <AppointmentReminder
                      key={`apt-${apt._id || index}`}
                      appointment={apt}
                      userId={userId}
                      userRole={userRole}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full bg-gray-50 rounded-xl p-4 text-center flex-shrink-0">
          <p className="text-sm text-gray-500">No reminders yet</p>
        </div>
      )}
    </div>
  );
}

function QuizReminder({
  appointment,
  userId,
  userRole,
}: {
  appointment: any;
  userId: string;
  userRole: "tutee" | "tutor";
}) {
  const appointmentDate = new Date(appointment.datetimeISO);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isTomorrow =
    appointmentDate.toDateString() ===
    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  let dateText = appointmentDate.toLocaleDateString();
  if (isToday) dateText = "today";
  else if (isTomorrow) dateText = "tomorrow";

  const timeText = appointmentDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasQuiz = appointment.quiz && appointment.quiz.length > 0;
  const isTutee = userId && appointment.tuteeId === userId;

  const quizAttempts = appointment.quizAttempts || [];
  const hasCompletedAttempt1 = quizAttempts.some(
    (attempt: any) => attempt.attempt === 1 && attempt.tuteeId === userId
  );
  const hasCompletedAttempt2 = quizAttempts.some(
    (attempt: any) => attempt.attempt === 2 && attempt.tuteeId === userId
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium text-xs">
        {appointment.subject || "Tutoring Session"}
      </div>
      <div className="text-xs opacity-90">
        {dateText} at {timeText}
      </div>

      {/* Quiz Attempt 1: Available when appointment is accepted and has quiz */}
      {appointment.status === "accepted" &&
        isTutee &&
        hasQuiz &&
        !hasCompletedAttempt1 && (
          <div className="space-y-2">
            <div className="text-blue-200 text-xs">
              📝 Pre-Session Quiz Available
            </div>
            <button
              onClick={() =>
                (window.location.href = `/quiz?appointmentId=${appointment.messageId}&attempt=1`)
              }
              className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200"
            >
              Take Quiz (Attempt 1)
            </button>
          </div>
        )}

      {/* Quiz Attempt 2: Available when appointment is completed and attempt 1 is done */}
      {appointment.status === "completed" &&
        isTutee &&
        hasQuiz &&
        hasCompletedAttempt1 &&
        !hasCompletedAttempt2 && (
          <div className="space-y-2">
            <div className="text-yellow-200 text-xs">
              📝 Post-Session Quiz Available
            </div>
            <button
              onClick={() =>
                (window.location.href = `/quiz?appointmentId=${appointment.messageId}&attempt=2`)
              }
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors duration-200"
            >
              Take Quiz (Attempt 2)
            </button>
          </div>
        )}

      {/* Show completion status */}
      {isTutee && hasQuiz && hasCompletedAttempt1 && hasCompletedAttempt2 && (
        <div className="text-green-200 text-xs">✅ All quizzes completed</div>
      )}
    </div>
  );
}

function AppointmentReminder({
  appointment,
  userId,
  userRole,
}: {
  appointment: any;
  userId: string;
  userRole: "tutee" | "tutor";
}) {
  const appointmentDate = new Date(appointment.datetimeISO);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isTomorrow =
    appointmentDate.toDateString() ===
    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  let dateText = appointmentDate.toLocaleDateString();
  if (isToday) dateText = "today";
  else if (isTomorrow) dateText = "tomorrow";

  const timeText = appointmentDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Check if tutor can mark as complete
  const isTutor = userId && appointment.tutorId === userId;
  const hasQuiz = appointment.quiz && appointment.quiz.length > 0;
  const quizAttempts = appointment.quizAttempts || [];
  const hasCompletedAttempt1 = quizAttempts.some(
    (attempt: any) =>
      attempt.attempt === 1 && attempt.tuteeId === appointment.tuteeId
  );

  // Tutor can mark as complete if: appointment is accepted, has quiz, and tutee completed attempt 1
  const canMarkComplete =
    isTutor &&
    appointment.status === "accepted" &&
    hasQuiz &&
    hasCompletedAttempt1;

  const handleMarkComplete = async () => {
    try {
      const result = await updateAppointmentCollectionStatus({
        messageId: appointment.messageId,
        status: "completed",
        userId: userId,
      });

      if (result.success) {
        // Refresh the page to update the UI
        window.location.reload();
      } else {
        console.error("Failed to mark appointment as complete:", result.error);
      }
    } catch (error) {
      console.error("Error marking appointment as complete:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium text-xs">
        {appointment.subject || "Tutoring Session"}
      </div>
      <div className="text-xs opacity-90">
        {dateText} at {timeText}
      </div>

      {appointment.status === "accepted" && (
        <div className="text-xs opacity-75">Status: Accepted</div>
      )}

      {/* Mark as Complete Button for Tutors */}
      {canMarkComplete && (
        <div className="space-y-2">
          <div className="text-green-200 text-xs">
            ✅ Ready to complete session
          </div>
          <button
            onClick={handleMarkComplete}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors duration-200"
          >
            Mark as Complete
          </button>
        </div>
      )}
    </div>
  );
}
