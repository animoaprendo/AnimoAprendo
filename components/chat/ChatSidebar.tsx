"use client";

import { User, Inquiry } from "./types";

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
  userRole
}: ChatSidebarProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-4 col-span-1 h-full">
      <UserInformation activeUser={activeUser} />
      <InquiryInformation inquiry={inquiry} />
      <RemindersSection
        upcomingAppointments={upcomingAppointments}
        appointmentsWithoutQuiz={appointmentsWithoutQuiz}
        userId={userId}
        userRole={userRole}
      />
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
            <div className="flex items-center justify-between mt-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                inquiry.status === "active"
                  ? "bg-green-100 text-green-800"
                  : inquiry.status === "completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
              }`}>
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
  userRole
}: {
  upcomingAppointments: any[];
  appointmentsWithoutQuiz: any[];
  userId: string;
  userRole: "tutee" | "tutor";
}) {
  const hasReminders = appointmentsWithoutQuiz.length > 0 || upcomingAppointments.length > 0;

  return (
    <div>
      <h4 className="font-semibold text-green-900 text-sm mb-2">
        Reminders
      </h4>
      {hasReminders ? (
        <ul className="text-sm space-y-1 *:bg-green-700 text-white/95 *:px-3 *:py-4 *:rounded-md overflow-y-auto max-h-[34rem] rounded-md">
          {appointmentsWithoutQuiz.length > 0 && (
            <li>
              <div className="flex flex-col gap-1">
                <div className="font-medium text-yellow-200">
                  ⚠️ Missing Quiz Content
                </div>
                <div className="text-xs opacity-90">
                  You have {appointmentsWithoutQuiz.length} accepted appointment(s) without quiz content.
                </div>
                <div className="text-xs opacity-75">
                  Please add quiz questions to your accepted appointments so tutees can take the required quizzes.
                </div>
              </div>
            </li>
          )}
          {upcomingAppointments.slice(0, 1).map((apt: any, index: number) => (
            <AppointmentReminder
              key={apt._id || `apt-${index}`}
              appointment={apt}
              userId={userId}
              userRole={userRole}
            />
          ))}
        </ul>
      ) : (
        <div className="w-full bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">
            No reminders yet
          </p>
        </div>
      )}
    </div>
  );
}

function AppointmentReminder({
  appointment,
  userId,
  userRole
}: {
  appointment: any;
  userId: string;
  userRole: "tutee" | "tutor";
}) {
  const appointmentDate = new Date(appointment.datetimeISO);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  let dateText = appointmentDate.toLocaleDateString();
  if (isToday) dateText = "today";
  else if (isTomorrow) dateText = "tomorrow";

  const timeText = appointmentDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasQuiz = appointment.quiz && appointment.quiz.length > 0;
  const isTutor = userId && appointment.tutorId === userId;
  const isTutee = userId && appointment.tuteeId === userId;

  const quizAttempts = appointment.quizAttempts || [];
  const hasCompletedAttempt1 = quizAttempts.some(
    (attempt: any) => attempt.attempt === 1 && attempt.tuteeId === userId
  );
  const hasCompletedAttempt2 = quizAttempts.some(
    (attempt: any) => attempt.attempt === 2 && attempt.tuteeId === userId
  );

  return (
    <li>
      <div className="flex flex-col gap-2">
        <div className="font-medium">
          📅 {appointment.subject || "Tutoring Session"}
        </div>
        <div className="text-xs opacity-90">
          {dateText} at {timeText}
        </div>
        
        {appointment.status === "accepted" && (
          <div className="text-xs opacity-75">
            Status: Accepted
          </div>
        )}

        {appointment.status === "completed" && isTutee && hasQuiz && (
          <div className="space-y-1">
            {!hasCompletedAttempt1 && (
              <div className="text-yellow-200 text-xs">
                📝 Quiz Attempt 1 available
              </div>
            )}
            {hasCompletedAttempt1 && !hasCompletedAttempt2 && (
              <div className="text-yellow-200 text-xs">
                📝 Quiz Attempt 2 available
              </div>
            )}
            {hasCompletedAttempt1 && hasCompletedAttempt2 && (
              <div className="text-green-200 text-xs">
                ✅ All quizzes completed
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}