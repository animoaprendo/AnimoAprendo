"use client";

import { User, Inquiry } from "./types";
import { updateAppointmentCollectionStatus } from "@/app/actions";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User | null;
  inquiry: Inquiry | null;
  upcomingAppointments: any[];
  appointmentsWithoutQuiz: any[];
  userId: string;
  userRole: "tutee" | "tutor";
}

export default function MobileSidebar({
  isOpen,
  onClose,
  activeUser,
  inquiry,
  upcomingAppointments,
  appointmentsWithoutQuiz,
  userId,
  userRole,
}: MobileSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="bg-white w-80 h-full p-6 shadow-lg rounded-l-2xl space-y-4 animate-slideInRight overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h4 className="font-semibold text-green-900">User Info</h4>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>

        <div>
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
                      {activeUser.firstName?.charAt(0) ||
                        activeUser.name.charAt(0)}
                      {activeUser.lastName?.charAt(0) || ""}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">
                    {activeUser.name}
                  </h5>
                  {activeUser.username && (
                    <p className="text-xs text-gray-500">
                      @{activeUser.username}
                    </p>
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
            <p className="text-sm text-gray-500">No user selected</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">Inquiry</h4>
          {inquiry ? (
            <div className="w-full bg-white rounded-xl shadow-lg transition-transform flex flex-col mb-4">
              <div className="relative">
                <img
                  src={inquiry.banner}
                  alt={inquiry.subject}
                  className="w-full h-20 object-cover rounded-t-xl"
                />
              </div>
              <div className="flex flex-col gap-2 p-3">
                <h2 className="font-bold text-sm text-green-900">
                  {inquiry.subject}
                </h2>
                <div
                  className="text-xs text-gray-600 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: inquiry.description }}
                />
                <div className="flex items-center justify-between mt-2">
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
            <div className="w-full bg-gray-50 rounded-xl p-3 text-center mb-4">
              <p className="text-xs text-gray-500">
                No inquiry information available
              </p>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            Reminders
          </h4>

          {/* Check if we have any reminders */}
          {appointmentsWithoutQuiz.length > 0 ||
          upcomingAppointments.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-[20rem]">
              {/* Quiz Reminders Card */}
              {upcomingAppointments.filter(
                (apt: any) => apt.quiz && apt.quiz.length > 0
              ).length > 0 && (
                <div className="bg-blue-600 text-white/95 px-3 py-4 rounded-md">
                  <div className="font-medium text-blue-100 mb-2">
                    📝 Quiz Reminders
                  </div>
                  <div className="space-y-3">
                    {upcomingAppointments
                      .filter((apt: any) => apt.quiz && apt.quiz.length > 0)
                      .slice(0, 2)
                      .map((apt: any, index: number) => (
                        <MobileQuizReminder
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
                            {appointment.time} - Add quiz questions
                          </div>
                          <button
                            onClick={() =>
                              (window.location.href = `/tutor/quiz/edit?appointmentId=${appointment.messageId}`)
                            }
                            className="mt-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 text-sm font-medium rounded-lg transition-colors duration-200"
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
                <div className="bg-green-700 text-white/95 px-3 py-4 rounded-md">
                  <div className="font-medium text-green-100 mb-2">
                    📅 Appointment Reminders
                  </div>
                  <div className="space-y-3">
                    {upcomingAppointments
                      .slice(0, 2)
                      .map((apt: any, index: number) => (
                        <MobileAppointmentReminder
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
            <p className="text-sm text-gray-500">No upcoming appointments</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileQuizReminder({
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
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors duration-200"
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

function MobileAppointmentReminder({
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
