"use client";

import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View, Event as RBCEvent } from "react-big-calendar";
import moment from "moment";
// @ts-ignore
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, BarChart3, Clock, User, MapPin, Eye, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    let backgroundColor = "hsl(var(--primary))"; // default primary
    let borderColor = "hsl(var(--primary))"; 
    
    // Color code by status with CSS variables
    if (event.status === 'completed') {
      backgroundColor = "hsl(142 76% 36%)"; // green-600
      borderColor = "hsl(142 76% 36%)";
    } else if (event.status === 'pending') {
      backgroundColor = "hsl(32 95% 44%)"; // amber-600
      borderColor = "hsl(32 95% 44%)";
    } else if (event.status === 'cancelled') {
      backgroundColor = "hsl(var(--destructive))"; // destructive
      borderColor = "hsl(var(--destructive))";
    } else if (event.status === 'declined') {
      backgroundColor = "hsl(var(--muted-foreground))"; // muted
      borderColor = "hsl(var(--muted-foreground))";
    }

    const style: React.CSSProperties = {
      backgroundColor,
      color: "white",
      borderRadius: "6px",
      padding: "4px 8px",
      border: `1px solid ${borderColor}`,
      display: "block",
      fontSize: "12px",
      fontWeight: "500",
      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    };
    return { style };
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center justify-center gap-2">
          <CalendarDays className="w-8 h-8" />
          Appointment Calendar
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage and review your tutoring schedules with real-time updates
        </p>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Schedule Overview
              </CardTitle>
              <CardDescription>
                Click on any appointment to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[500px] sm:h-[600px] md:h-[700px] [&_.rbc-calendar]:font-sans [&_.rbc-header]:bg-muted/50 [&_.rbc-header]:font-medium [&_.rbc-toolbar]:mb-4">
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
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                Statistics
              </CardTitle>
              <CardDescription>
                Overview of your appointment activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                    <span className="text-2xl font-bold">{s.value}</span>
                  </div>
                  {i < stats.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Quick Actions Card */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/tutor/subjects">
                  <User className="w-4 h-4 mr-2" />
                  Manage Subjects
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/tutor/dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Dashboard
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Start Time</p>
                    <p className="text-muted-foreground">
                      {moment(selectedEvent.start).format("MMMM Do, YYYY [at] h:mm A")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">End Time</p>
                    <p className="text-muted-foreground">
                      {moment(selectedEvent.end).format("MMMM Do, YYYY [at] h:mm A")}
                    </p>
                  </div>
                </div>
                
                {selectedEvent.tuteeName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Student</p>
                      <p className="text-muted-foreground">{selectedEvent.tuteeName}</p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.mode && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Mode</p>
                      <p className="text-muted-foreground capitalize">{selectedEvent.mode}</p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.status && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedEvent.status === 'completed' ? 'bg-green-500' :
                        selectedEvent.status === 'accepted' ? 'bg-blue-500' :
                        selectedEvent.status === 'pending' ? 'bg-yellow-500' :
                        selectedEvent.status === 'cancelled' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <Badge variant={
                        selectedEvent.status === 'completed' ? 'default' :
                        selectedEvent.status === 'accepted' ? 'secondary' :
                        selectedEvent.status === 'pending' ? 'outline' :
                        selectedEvent.status === 'cancelled' ? 'destructive' :
                        'secondary'
                      }>
                        {selectedEvent.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            {/* {selectedEvent?.appointmentId && (
              <Button asChild>
                <a href={`/tutor/appointments/${selectedEvent.appointmentId}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </a>
              </Button>
            )} */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}