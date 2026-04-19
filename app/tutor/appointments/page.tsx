import { fetchAppointments, fetchUsers } from "@/app/actions";
import { currentUser } from "@clerk/nextjs/server";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import ClientCalendar from "./ClientCalendar";

export default async function TutorAppointmentsPage() {
  noStore();
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  // Fetch appointments from MongoDB
  const appointmentsResult = await fetchAppointments(user.id);
  
  let events: any[] = [];
  let stats = [
    { label: "Total Sessions", value: 0 },
    { label: "Completed", value: 0 },
    { label: "Accepted", value: 0 },
    { label: "Rejected", value: 0 },
  ];

  if (appointmentsResult.success && appointmentsResult.appointments) {
    // Filter appointments where current user is the tutor and status is accepted/completed
    const tutorAppointments = appointmentsResult.appointments.filter((apt: any) => 
      apt.tutorId === user.id && (apt.status === "accepted" || apt.status === "completed")
    );

    // Calculate statistics for displayed sessions (accepted + completed)
    stats[0].value = tutorAppointments.length;
    stats[1].value = tutorAppointments.filter((apt: any) => apt.status === 'completed').length;
    stats[2].value = tutorAppointments.filter((apt: any) => apt.status === 'accepted').length;
    stats[3].value = tutorAppointments.filter((apt: any) => apt.status === 'rejected').length;

    // Get tutee user data for appointments that have them
    const appointmentsWithTutees = tutorAppointments.filter((apt: any) => apt.tuteeId);
    
    if (appointmentsWithTutees.length > 0) {
      const tuteeIds = appointmentsWithTutees.map((apt: any) => apt.tuteeId);
      const usersResult = await fetchUsers(tuteeIds);
      
      // Transform appointments into calendar events
      events = tutorAppointments.flatMap((apt: any) => {
        // Find tutee name
        let tuteeName = 'Unknown Student';
        if (usersResult.success && usersResult.data && usersResult.data.users) {
          const tuteeData = usersResult.data.users.find((u: any) => u.id === apt.tuteeId);
          if (tuteeData) {
            tuteeName = tuteeData.displayName || tuteeData.firstName + ' ' + tuteeData.lastName || 'Student';
          }
        }

        // Create event title using subject field
        const subject = apt.subject || 'Tutoring Session';
        const title = `${subject} with ${tuteeName}`;

        // Extract time from datetimeISO
        const baseDateTime = new Date(apt.datetimeISO);
        const hours = baseDateTime.getHours();
        const minutes = baseDateTime.getMinutes();

        // Duration in minutes (default 60)
        const durationMinutes = Number(apt.durationMinutes ?? apt.duration ?? 60);
        const safeDurationMinutes = Number.isFinite(durationMinutes) && durationMinutes > 0
          ? durationMinutes
          : 60;

        // Helper function to create an event for a single date
        const createEventForDate = (dateString: string) => {
          try {
            const dateObj = new Date(`${dateString}T00:00:00`);
            const startDate = new Date(
              dateObj.getFullYear(),
              dateObj.getMonth(),
              dateObj.getDate(),
              hours,
              minutes
            );
            const endDate = new Date(startDate.getTime() + safeDurationMinutes * 60 * 1000);

            return {
              title,
              start: startDate,
              end: endDate,
              appointmentId: apt._id || apt.messageId,
              status: apt.status,
              mode: apt.mode,
              tuteeId: apt.tuteeId,
              tuteeName: tuteeName,
              meetingUrl: apt.meetingUrl || null,
              meetingId: apt.meetingId || apt.messageId || apt._id || null
            };
          } catch (e) {
            console.warn('Failed to create event for date:', dateString, e);
            return null;
          }
        };

        // NEW FORMAT: If dates array exists, create event for each date
        if (Array.isArray(apt.dates) && apt.dates.length > 0) {
          return apt.dates
            .map((dateString: string) => createEventForDate(dateString))
            .filter((event: any) => event !== null);
        }

        // LEGACY FORMAT: Use datetimeISO and endDate/durationMinutes logic
        const startDate = new Date(apt.datetimeISO);
        const appointmentType = String(apt.appointmentType || "single").toLowerCase();

        let endDate: Date;
        if (appointmentType === "recurring" && apt.endDate) {
          const recurringEnd = new Date(apt.endDate);
          endDate = Number.isNaN(recurringEnd.getTime())
            ? new Date(startDate.getTime() + 60 * 60 * 1000)
            : recurringEnd;
        } else {
          endDate = new Date(startDate.getTime() + safeDurationMinutes * 60 * 1000);
        }

        return [{
          title,
          start: startDate,
          end: endDate,
          appointmentId: apt._id || apt.messageId,
          status: apt.status,
          mode: apt.mode,
          tuteeId: apt.tuteeId,
          tuteeName: tuteeName,
          meetingUrl: apt.meetingUrl || null,
          meetingId: apt.meetingId || apt.messageId || apt._id || null
        }];
      });
    }
  }

  return <ClientCalendar events={events} stats={stats} />;
}
