// Updated example showing how to create Jitsi meetings with the new authentication system

import { createGoogleMeetMeetingWithAuth, createMeetingTimes } from '@/lib/google-meet';
import { buildApiUrl } from './url-utils';

/**
 * Example: Create a Jitsi meeting when an appointment is accepted
 */
export async function createAppointmentGoogleMeetMeeting(appointment: {
  datetimeISO: string;
  subject: string;
  tutorId: string; // Clerk user ID of the tutor
  tuteeEmail?: string;
  additionalAttendees?: string[];
}) {
  try {
    // Parse the appointment date
    const appointmentDate = new Date(appointment.datetimeISO);
    const { startDateTime, endDateTime } = createMeetingTimes(appointmentDate, 60);

    // Prepare attendees list
    const attendees: string[] = [];
    if (appointment.tuteeEmail) {
      attendees.push(appointment.tuteeEmail);
    }
    if (appointment.additionalAttendees) {
      attendees.push(...appointment.additionalAttendees);
    }

    // Create the meeting using the tutor's Google account
    const result = await createGoogleMeetMeetingWithAuth({
      startDateTime,
      endDateTime,
      subject: appointment.subject,
      attendees: attendees.length > 0 ? attendees : undefined
    }, appointment.tutorId); // Pass the tutor's user ID

    if (result.success && result.meeting) {
      console.log('Google Meet link created:', result.meeting.joinUrl);
      return {
        success: true,
        meetingUrl: result.meeting.joinUrl,
        meetingId: result.meeting.id
      };
    } else {
      console.error('Failed to create Google Meet link:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error in createAppointmentGoogleMeetMeeting:', error);
    return {
      success: false,
      error: 'Failed to create meeting'
    };
  }
}

/**
 * Example: Check whether a user can create a meeting link
 */
export async function checkGoogleConnection(userId?: string): Promise<boolean> {
  try {
    const url = buildApiUrl('/api/auth/microsoft/token');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error checking Google connection:', error);
    return false;
  }
}

/**
 * Example: Integration with appointment acceptance flow
 */
export async function acceptAppointmentWithGoogleMeet(
  messageId: string,
  tutorId: string,
  tuteeEmail?: string
) {
  try {
    // 1. First, accept the appointment (your existing logic)
    const acceptResult = await fetch('/api/appointments/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, action: 'accept' })
    });

    if (!acceptResult.ok) {
      return {
        success: false,
        error: 'Failed to accept appointment'
      };
    }

    const appointment = await acceptResult.json();

    // 2. Check if tutor has Google account connected
    const hasConnection = await checkGoogleConnection(tutorId);
    if (!hasConnection) {
      return {
        success: true,
        appointment: appointment,
        warning: 'Appointment accepted, but tutor needs to connect Google account to create Google Meet link'
      };
    }

    // 3. Create Google Meet meeting
    const meetingResult = await createAppointmentGoogleMeetMeeting({
      datetimeISO: appointment.datetime,
      subject: `Tutoring: ${appointment.subject}`,
      tutorId: tutorId,
      tuteeEmail: tuteeEmail
    });

    return {
      success: true,
      appointment: appointment,
      meeting: meetingResult.success ? meetingResult : undefined,
      meetingError: meetingResult.success ? undefined : meetingResult.error
    };

  } catch (error) {
    console.error('Error in acceptAppointmentWithGoogleMeet:', error);
    return {
      success: false,
      error: 'Failed to process appointment'
    };
  }
}

/**
 * Example: Bulk create Jitsi meetings for multiple appointments
 */
export async function createBulkMeetingsForAppointments(
  appointments: Array<{
    id: string;
    datetimeISO: string;
    subject: string;
    tutorId: string;
    tuteeEmail?: string;
  }>
) {
  const results = [];

  for (const appointment of appointments) {
    const result = await createAppointmentGoogleMeetMeeting(appointment);
    results.push({
      appointmentId: appointment.id,
      ...result
    });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return {
    total: appointments.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

