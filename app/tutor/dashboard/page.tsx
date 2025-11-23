import RatingGFX from "@/components/star-rating";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  User,
  Award,
  MapPin,
  Eye,
  TrendingUp,
} from "lucide-react";
import { redirect, RedirectType } from "next/navigation";
import { fetchAppointments, fetchUsers } from "@/app/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getMicrosoftAccessToken } from '@/lib/microsoft-oauth';


export default async function Dashboard() {
  const user = await currentUser();

  if (!user) redirect("/", RedirectType.replace);

  // Fetch real appointments from database
  const appointmentsResult = await fetchAppointments(user.id);
  const tokens = await getMicrosoftAccessToken(user.id);
  console.log(tokens)

  let upcomingAppointments: any[] = [];
  let stats = {
    totalAppointments: 0,
    completed: 0,
    upcoming: 0,
  };
  let hasError = false;

  if (appointmentsResult.success && appointmentsResult.appointments) {
    const now = new Date();

    // Filter appointments where current user is the tutor
    const tutorAppointments = appointmentsResult.appointments.filter(
      (apt: any) => apt.tutorId === user.id
    );

    // Calculate statistics
    stats.totalAppointments = tutorAppointments.length;
    stats.completed = tutorAppointments.filter(
      (apt: any) => apt.status === "completed"
    ).length;

    // Get upcoming appointments (accepted or completed, future dates)
    const upcoming = tutorAppointments
      .filter(
        (apt: any) =>
          (apt.status === "accepted" || apt.status === "completed") &&
          new Date(apt.datetimeISO) > now
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime()
      )
      .slice(0, 5); // Limit to 5 most recent

    stats.upcoming = upcoming.length;

    // Fetch tutee user data for the upcoming appointments
    if (upcoming.length > 0) {
      const tuteeIds = upcoming.map((apt: any) => apt.tuteeId);
      const usersResult = await fetchUsers(tuteeIds);

      if (
        usersResult.success &&
        usersResult.data &&
        usersResult.data.users &&
        Array.isArray(usersResult.data.users)
      ) {
        // Map appointment data with user names
        upcomingAppointments = upcoming.map((apt: any) => {
          const tuteeData = usersResult.data.users.find(
            (u: any) => u.id === apt.tuteeId
          );
          const appointmentDate = new Date(apt.datetimeISO);
          const endDate = apt.endDate ? new Date(apt.endDate) : null;

          return {
            id: apt._id || apt.messageId,
            tutee: tuteeData ? tuteeData.displayName : "Unknown User",
            subject: apt.subject || "Tutoring Session",
            appointmentType: apt.appointmentType || "single",
            startDate: appointmentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            endDate: endDate
              ? endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : undefined,
            time: `${appointmentDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`,
            mode: apt.mode === "online" ? "Online" : "Face-to-Face",
            status: apt.status,
            rawDate: apt.datetimeISO,
          };
        });
      } else {
        // Fallback: show appointments even if user data fetch failed
        upcomingAppointments = upcoming.map((apt: any) => {
          const appointmentDate = new Date(apt.datetimeISO);

          return {
            id: apt._id || apt.messageId,
            tutee: "Loading...", // Will show this if user data fails to load
            subject: apt.subject || "Tutoring Session",
            date: appointmentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: `${appointmentDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })} - ${new Date(
              appointmentDate.getTime() + 60 * 60 * 1000
            ).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`,
            mode: apt.mode === "online" ? "Online" : "Face-to-Face",
            status: apt.status,
            rawDate: apt.datetimeISO,
          };
        });
      }
    }
  } else {
    // Handle error case
    hasError = true;
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-primary/20">
                <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
                <AvatarFallback className="text-lg">
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-semibold mb-2">{user.fullName}</h2>
              <p className="text-muted-foreground mb-4">@{user.username}</p>

              <Button asChild className="w-full">
                <Link href="/tutor/profile">
                  <Eye className="w-4 h-4 mr-2" />
                  View Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Level Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Level Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Level</span>
                <Badge variant="secondary">New Tutor</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rating</span>
                <RatingGFX rating={5} />
              </div>

              <Separator />

              <Button variant="outline" className="w-full" asChild>
                <Link href="#">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Progress
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Availability Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your tutoring schedule and set your available hours for
                students to book sessions.
              </p>

              <Button variant="outline" className="w-full" asChild>
                <Link href="#">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Manage Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, {user.fullName}!
            </h1>
            <p className="text-muted-foreground text-lg">
              Here's an overview of your tutoring activity and upcoming
              sessions.
            </p>
          </div>

          <Separator />

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-3xl font-bold mb-2">
                  {stats.totalAppointments}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Total Appointments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-3xl font-bold mb-2">{stats.completed}</h3>
                <p className="text-sm text-muted-foreground">
                  Completed Sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="text-3xl font-bold mb-2">{stats.upcoming}</h3>
                <p className="text-sm text-muted-foreground">
                  Upcoming Sessions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Your next scheduled tutoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appt) => (
                    <Card key={appt.id} className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{appt.tutee}</h4>
                            {appt.status === "completed" && (
                              <Badge variant="secondary" className="text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {appt.appointmentType === "single"
                                ? "Single Session  •"
                                : "Recurring Session  •"}
                            </span>
                            <span>{appt.subject}</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {appt.mode}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appt.startDate}{" "}
                            {appt.endDate && `- ${appt.endDate}`} • {appt.time}
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href="/tutor/appointments">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : hasError ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                    <h3 className="font-medium text-destructive mb-2">
                      Unable to load appointments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Please refresh the page or try again later
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      New appointment requests will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
