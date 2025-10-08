"use client";

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View, Event as RBCEvent } from "react-big-calendar";
import moment from "moment";
// @ts-ignore
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface CalendarEvent extends RBCEvent {
  title: string;
  start: Date;
  end: Date;
  appointmentId?: string;
  status?: string;
  mode?: string;
  tuteeId?: string;
  tuteeName?: string;
}

interface ClientCalendarProps {
  events: CalendarEvent[];
  stats: Array<{ label: string; value: number }>;
}

export default function ClientCalendar({ events, stats }: ClientCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setView("day");
    }
  }, []);

  function handleSelectEvent(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#16a34a"; // default green
    
    // Color code by status
    if (event.status === 'completed') {
      backgroundColor = "#059669"; // green-600
    } else if (event.status === 'pending') {
      backgroundColor = "#d97706"; // amber-600
    } else if (event.status === 'cancelled') {
      backgroundColor = "#dc2626"; // red-600
    } else if (event.status === 'declined') {
      backgroundColor = "#6b7280"; // gray-500
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

  return (
    <div className="w-11/12 mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold mb-2">📆 Tutor Appointments</h1>
        <p className="text-gray-500">
          Manage and review your tutoring schedules with real-time updates.
        </p>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-lg">
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

        {/* Statistics */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">📊 Statistics</h2>
          <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
              >
                <span className="text-gray-600">{s.label}</span>
                <span className="text-xl font-bold text-green-700">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-96 max-w-full">
            <h3 className="text-2xl font-bold mb-4">{selectedEvent.title}</h3>
            
            <div className="space-y-2 mb-4">
              <p className="text-gray-600">
                <strong>From:</strong> {moment(selectedEvent.start).format("LLLL")}
              </p>
              <p className="text-gray-600">
                <strong>To:</strong> {moment(selectedEvent.end).format("LLLL")}
              </p>
              {selectedEvent.tuteeName && (
                <p className="text-gray-600">
                  <strong>Student:</strong> {selectedEvent.tuteeName}
                </p>
              )}
              {selectedEvent.mode && (
                <p className="text-gray-600">
                  <strong>Mode:</strong> <span className="capitalize">{selectedEvent.mode}</span>
                </p>
              )}
              {selectedEvent.status && (
                <p className="text-gray-600">
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    selectedEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedEvent.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    selectedEvent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedEvent.status}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>
              {/* {selectedEvent.appointmentId && (
                <button
                  onClick={() => {
                    window.location.href = `/tutor/appointments/${selectedEvent.appointmentId}`;
                  }}
                  className="px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800"
                >
                  View Details
                </button>
              )} */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}