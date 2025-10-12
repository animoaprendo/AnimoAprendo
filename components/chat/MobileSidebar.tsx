"use client";

import { User, Inquiry } from "./types";

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
  userRole
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
            <p className="text-sm text-gray-500">No user selected</p>
          )}
        </div>
        
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            Inquiry
          </h4>
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
          <ul className="text-sm space-y-1 *:bg-green-700 text-white/95 *:px-3 *:py-4 *:rounded-md overflow-y-auto max-h-[20rem] rounded-md">
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
                    Please add quiz questions to your accepted appointments.
                  </div>
                </div>
              </li>
            )}
            {upcomingAppointments.slice(0, 2).map((apt: any, index: number) => (
              <MobileAppointmentReminder
                key={apt._id || `apt-${index}`}
                appointment={apt}
                userId={userId}
                userRole={userRole}
              />
            ))}
          </ul>
          {upcomingAppointments.length === 0 && appointmentsWithoutQuiz.length === 0 && (
            <p className="text-sm text-gray-500">
              No upcoming appointments
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileAppointmentReminder({
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
      </div>
    </li>
  );
}