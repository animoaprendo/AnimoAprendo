"use client";

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View, Event as RBCEvent } from "react-big-calendar";
import moment from "moment";
// @ts-ignore
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface AppointmentEvent extends RBCEvent {
  id: string;
  appointmentId: string;
  tutorName: string;
  subject: string;
  mode: string;
  status: string;
}

interface TuteeAppointmentsClientProps {
  initialEvents: AppointmentEvent[];
}

export default function TuteeAppointmentsClient({ initialEvents }: TuteeAppointmentsClientProps) {
  const [events] = useState<AppointmentEvent[]>(initialEvents);
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setView("day"); // mobile defaults to day view
    }
  }, []);

  function handleSelectEvent(event: AppointmentEvent) {
    setSelectedEvent(event);
  }

  const eventStyleGetter = (event: AppointmentEvent) => {
    let backgroundColor = "#16a34a"; // default green

    // Color based on status
    switch (event.status) {
      case 'completed':
        backgroundColor = "#059669"; // emerald-600
        break;
      case 'cancelled':
        backgroundColor = "#dc2626"; // red-600
        break;
      case 'pending':
        backgroundColor = "#d97706"; // amber-600
        break;
      default:
        backgroundColor = "#16a34a"; // green-600
    }

    const style: React.CSSProperties = {
      backgroundColor,
      color: "white",
      borderRadius: "6px",
      padding: "2px 6px",
      border: "0px",
      display: "block",
    };
    return { style };
  };

  const handleJoinSession = (event: AppointmentEvent) => {
    // You can implement the join logic here
    // For now, just show an alert
    alert(`📌 Joining session with ${event.tutorName}!`);
    setSelectedEvent(null);
  };

  return (
    <div className="w-11/12 mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold mb-2">📆 My Appointments</h1>
        <p className="text-gray-500">
          View your scheduled tutoring and consultation sessions.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-lg text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">No Appointments Yet</h3>
          <p className="text-gray-500 mb-6">
            You don't have any scheduled appointments. Browse subjects to book your first session!
          </p>
          <a 
            href="/browse" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Browse Subjects
          </a>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-800">{events.length}</div>
              <div className="text-blue-600 text-sm">Total Sessions</div>
            </div>
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-800">
                {events.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-green-600 text-sm">Completed</div>
            </div>
            <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-800">
                {events.filter(e => e.status === 'pending' || e.status === 'active').length}
              </div>
              <div className="text-yellow-600 text-sm">Upcoming</div>
            </div>
            <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-800">
                {events.filter(e => e.status === 'cancelled').length}
              </div>
              <div className="text-red-600 text-sm">Cancelled</div>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white p-6 rounded-2xl shadow-lg overflow-x-auto">
            <div className="h-[500px] sm:h-[600px] md:h-[700px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={(v) => setView(v as View)}
                views={["month", "week", "day"]}
                defaultView="month"
                onSelectEvent={handleSelectEvent}
                popup
                eventPropGetter={eventStyleGetter}
              />
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-96 max-w-full">
            <h3 className="text-2xl font-bold mb-4">{selectedEvent.title}</h3>
            
            <div className="space-y-2 mb-4">
              <p className="text-gray-600">
                <strong>Tutor:</strong> {selectedEvent.tutorName}
              </p>
              <p className="text-gray-600">
                <strong>Subject:</strong> {selectedEvent.subject}
              </p>
              <p className="text-gray-600">
                <strong>Mode:</strong> {selectedEvent.mode}
              </p>
              <p className="text-gray-600">
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  selectedEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  selectedEvent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedEvent.status?.charAt(0).toUpperCase() + selectedEvent.status?.slice(1)}
                </span>
              </p>
              <p className="text-gray-600">
                <strong>From:</strong> {moment(selectedEvent.start).format("LLLL")}
              </p>
              <p className="text-gray-600">
                <strong>To:</strong> {moment(selectedEvent.end).format("LLLL")}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              
              {selectedEvent.status !== 'completed' && selectedEvent.status !== 'cancelled' && (
                <button
                  onClick={() => handleJoinSession(selectedEvent)}
                  className="px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors"
                >
                  Join Session
                </button>
              )}
              
              {selectedEvent.status === 'completed' && (
                <a
                  href={`/chat/${selectedEvent.appointmentId}`}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                >
                  View Chat
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}