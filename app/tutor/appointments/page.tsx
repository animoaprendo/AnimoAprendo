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
      events = tutorAppointments.map((apt: any) => {
        const startDate = new Date(apt.datetimeISO);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
        
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
          meetingId: apt.meetingId || null
        };
      });
    }
  }

  return <ClientCalendar events={events} stats={stats} />;
}
