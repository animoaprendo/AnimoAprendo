"use client";

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View, Event as RBCEvent } from "react-big-calendar";
import moment from "moment";
// @ts-ignore
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, BookOpen, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

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

  const handleJoinSession = (event: AppointmentEvent | null) => {
    if (!event) return;
    // You can implement the join logic here
    // For now, just show an alert
    alert(`📌 Joining session with ${event.tutorName}!`);
    setSelectedEvent(null);
  };

  return (
    <div className="w-11/12 mx-auto py-8 space-y-6">
      {/* <div className="text-center">
        <h1 className="text-4xl font-extrabold mb-2 text-green-900 flex items-center justify-center gap-2">
          <CalendarDays className="h-10 w-10" />
          My Appointments
        </h1>
        <p className="text-gray-500">
          View your scheduled tutoring and consultation sessions.
        </p>
      </div> */}

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Appointments Yet</h3>
            <p className="text-gray-500 mb-6">
              You don't have any scheduled appointments. Browse subjects to book your first session!
            </p>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/browse">
                Browse Subjects
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-800">{events.length}</div>
                </div>
                <div className="text-blue-600 text-sm">Total Sessions</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-2xl font-bold text-green-800">
                    {events.filter(e => e.status === 'completed').length}
                  </div>
                </div>
                <div className="text-green-600 text-sm">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-800">
                    {events.filter(e => e.status === 'pending' || e.status === 'active').length}
                  </div>
                </div>
                <div className="text-yellow-600 text-sm">Upcoming</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="text-2xl font-bold text-red-800">
                    {events.filter(e => e.status === 'cancelled').length}
                  </div>
                </div>
                <div className="text-red-600 text-sm">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <Card>
            <CardContent className="p-6">
              <div className="h-[500px] sm:h-[600px] md:h-[700px] overflow-x-auto">
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="w-96 max-w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-900">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Tutor:</span>
                <span className="text-gray-900">{selectedEvent.tutorName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Subject:</span>
                <Badge variant="secondary">{selectedEvent.subject}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Mode:</span>
                <Badge variant="outline">{selectedEvent.mode}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Status:</span>
                <Badge 
                  className={`${
                    selectedEvent.status === 'completed' ? 'bg-green-600 hover:bg-green-600' :
                    selectedEvent.status === 'cancelled' ? 'bg-red-600 hover:bg-red-600' :
                    selectedEvent.status === 'pending' ? 'bg-yellow-600 hover:bg-yellow-600' :
                    'bg-blue-600 hover:bg-blue-600'
                  } text-white`}
                >
                  {selectedEvent.status?.charAt(0).toUpperCase() + selectedEvent.status?.slice(1)}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">From:</span>
                  <span className="text-sm text-gray-600">
                    {moment(selectedEvent.start).format("MMM D, YYYY [at] h:mm A")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="text-sm text-gray-600">
                    {moment(selectedEvent.end).format("MMM D, YYYY [at] h:mm A")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </Button>
            
            {selectedEvent?.status !== 'completed' && selectedEvent?.status !== 'cancelled' && (
              <Button
                onClick={() => handleJoinSession(selectedEvent)}
                className="bg-green-700 hover:bg-green-800"
              >
                Join Session
              </Button>
            )}
            
            {selectedEvent?.status === 'completed' && (
              <Button asChild className="bg-blue-700 hover:bg-blue-800">
                <Link href={`/chat/${selectedEvent.appointmentId}`}>
                  View Chat
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}