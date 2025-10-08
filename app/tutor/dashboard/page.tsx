import RatingGFX from "@/components/star-rating";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { CalendarDays, CheckCircle, Clock } from "lucide-react";
import { redirect, RedirectType } from "next/navigation";
import { fetchAppointments, fetchUsers } from "@/app/actions";

export default async function Dashboard() {
  const user = await currentUser();

  if (!user) redirect("/", RedirectType.replace);

  // Fetch real appointments from database
  const appointmentsResult = await fetchAppointments(user.id);
  
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
    const tutorAppointments = appointmentsResult.appointments.filter((apt: any) => 
      apt.tutorId === user.id
    );

    // Calculate statistics
    stats.totalAppointments = tutorAppointments.length;
    stats.completed = tutorAppointments.filter((apt: any) => apt.status === 'completed').length;
    
    // Get upcoming appointments (accepted or completed, future dates)
    const upcoming = tutorAppointments.filter((apt: any) => 
      (apt.status === 'accepted' || apt.status === 'completed') && 
      new Date(apt.datetimeISO) > now
    ).sort((a: any, b: any) => 
      new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime()
    ).slice(0, 5); // Limit to 5 most recent

    stats.upcoming = upcoming.length;

    // Fetch tutee user data for the upcoming appointments
    if (upcoming.length > 0) {
      const tuteeIds = upcoming.map((apt: any) => apt.tuteeId);
      const usersResult = await fetchUsers(tuteeIds);
      
      if (usersResult.success && usersResult.data && usersResult.data.users && Array.isArray(usersResult.data.users)) {
        // Map appointment data with user names
        upcomingAppointments = upcoming.map((apt: any) => {
          const tuteeData = usersResult.data.users.find((u: any) => u.id === apt.tuteeId);
          const appointmentDate = new Date(apt.datetimeISO);
          
          return {
            id: apt._id || apt.messageId,
            tutee: tuteeData ? tuteeData.displayName : 'Unknown User',
            subject: apt.subject || 'Tutoring Session',
            date: appointmentDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: `${appointmentDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })} - ${new Date(appointmentDate.getTime() + 60 * 60 * 1000).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })}`,
            mode: apt.mode === 'online' ? 'Online' : 'Face-to-Face',
            status: apt.status,
            rawDate: apt.datetimeISO
          };
        });
      } else {
        // Fallback: show appointments even if user data fetch failed
        upcomingAppointments = upcoming.map((apt: any) => {
          const appointmentDate = new Date(apt.datetimeISO);
          
          return {
            id: apt._id || apt.messageId,
            tutee: 'Loading...', // Will show this if user data fails to load
            subject: apt.subject || 'Tutoring Session',
            date: appointmentDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: `${appointmentDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })} - ${new Date(appointmentDate.getTime() + 60 * 60 * 1000).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            })}`,
            mode: apt.mode === 'online' ? 'Online' : 'Face-to-Face',
            status: apt.status,
            rawDate: apt.datetimeISO
          };
        });
      }
    }
  } else {
    // Handle error case
    hasError = true;
  }

  return (
    <div className="flex flex-col lg:flex-row py-6 gap-8 lg:gap-12 w-11/12 mx-auto text-neutral-800">
      {/* Left Panels */}
      <div className="flex flex-col gap-6 lg:w-3/12 *:px-5 *:py-4 *:border-neutral-400 *:border-2 *:rounded-2xl *:flex *:flex-col *:items-center">
        {/* Profile */}
        <div className="flex flex-col gap-2 select-none">
          <Image
            src={user.imageUrl}
            alt=""
            width={500}
            height={500}
            className="object-cover w-[80px] rounded-full border-green-800 border-4 aspect-square"
          />

          <h1 className="font-bold">{user.fullName}</h1>
          <h2 className="text-neutral-600">
            @
            <a href="#" className="hover:underline">
              {user.username}
            </a>
          </h2>

          <Link
            href={"/tutor/profile"}
            className="bg-green-900 text-white w-full text-center py-2 rounded-lg hover:bg-green-800"
          >
            View Profile
          </Link>
        </div>

        {/* Level Overview */}
        <div className="flex flex-col gap-6 w-full select-none">
          <h1 className="font-bold text-xl">Level Overview</h1>
          <div className="flex flex-col gap-2 w-full text-neutral-600">
            <div className="flex flex-row justify-between items-center">
              <h1 className="text-lg font-semibold">My Level</h1>
              <span className="text-neutral-800 font-bold ml-auto">
                New Tutor
              </span>
            </div>
            <div className="flex flex-row justify-between items-center">
              <h1 className="text-lg font-semibold">Rating</h1>
              <span>
                <RatingGFX rating={5} />
              </span>
            </div>
          </div>
          <Link
            href={"#"}
            className="bg-green-900 text-white w-full text-center py-2 rounded-lg hover:bg-green-800"
          >
            View Progress
          </Link>
        </div>

        {/* Availability */}
        <div className="flex flex-col gap-6 w-full">
          <h1 className="font-bold text-xl select-none">Availability</h1>
          <h2 className="text-neutral-600">
            Lorem ipsum dolor sit amet conse adipisicing elit.
          </h2>
          <Link
            href={"#"}
            className="bg-green-900 text-white w-full text-center py-2 rounded-lg hover:bg-green-800 select-none"
          >
            View Availability
          </Link>
        </div>
      </div>

      {/* Right Panels */}
      <div className="flex flex-col gap-6 lg:w-9/12">
        {/* Welcome */}
        <div className="select-none">
          <h1 className="text-2xl font-bold">Welcome, {user.fullName}</h1>
          <h2 className="text-neutral-600">
            Dashboard Description: (To Change)
          </h2>
        </div>
        <hr className="bg-neutral-300" />

        {/* Statistics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
          <div className="bg-green-100 border border-green-300 rounded-xl p-6 flex flex-col items-center">
            <CalendarDays className="h-10 w-10 text-green-800 mb-2" />
            <h3 className="text-3xl font-bold text-green-900">
              {stats.totalAppointments}
            </h3>
            <p className="text-neutral-600">Total Appointments</p>
          </div>

          <div className="bg-blue-100 border border-blue-300 rounded-xl p-6 flex flex-col items-center">
            <CheckCircle className="h-10 w-10 text-blue-800 mb-2" />
            <h3 className="text-3xl font-bold text-blue-900">
              {stats.completed}
            </h3>
            <p className="text-neutral-600">Completed</p>
          </div>

          <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-6 flex flex-col items-center">
            <Clock className="h-10 w-10 text-yellow-800 mb-2" />
            <h3 className="text-3xl font-bold text-yellow-900">
              {stats.upcoming}
            </h3>
            <p className="text-neutral-600">Upcoming</p>
          </div>
        </div>

        <hr className="bg-neutral-300" />

        {/* Active Bookings / Upcoming */}
        <div>
          <h1 className="text-xl font-bold mb-2 select-none">Upcoming Appointments</h1>
          <div className="flex flex-col gap-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="border px-4 py-3 rounded-xl flex flex-col lg:flex-row items-center justify-between"
                >
                  <div>
                    <div className="font-bold">{appt.tutee}</div>
                    <div className="text-sm text-neutral-600">
                      {appt.subject} | {appt.mode}
                      {appt.status === 'completed' && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {appt.date} – {appt.time}
                    </div>
                  </div>
                  <Link
                    href="/tutor/appointments"
                    className="bg-green-900 text-white py-2 px-4 rounded-xl hover:bg-green-800 mt-2 lg:mt-0 h-fit select-none"
                  >
                    View
                  </Link>
                </div>
              ))
            ) : hasError ? (
              <div className="border px-4 py-6 rounded-xl text-center text-red-600">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 text-red-400" />
                <p>Unable to load appointments</p>
                <p className="text-sm">Please refresh the page or try again later</p>
              </div>
            ) : (
              <div className="border px-4 py-6 rounded-xl text-center text-neutral-600">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
                <p>No upcoming appointments</p>
                <p className="text-sm">New appointment requests will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
