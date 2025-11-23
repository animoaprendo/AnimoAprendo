// Example usage of Microsoft Teams integration
// This can be integrated into your appointment creation or chat system

import { createTeamsMeeting, createMeetingTimes, CreateMeetingRequest } from '@/lib/microsoft-teams';

// Example 1: Create a Teams meeting when an appointment is accepted
export async function createAppointmentTeamsMeeting(appointment: {
  datetimeISO: string;
  subject: string;
  tutorAccessToken: string; // You'll need to get this from Microsoft OAuth
  tuteeEmail?: string; // Optional: add tutee as attendee
  additionalAttendees?: string[]; // Optional: other attendees
}) {
  try {
    const appointmentDate = new Date(appointment.datetimeISO);
    const { startDateTime, endDateTime } = createMeetingTimes(appointmentDate, 60); // 60 min session
    
    // Prepare attendees list
    const attendees: string[] = [];
    if (appointment.tuteeEmail) {
      attendees.push(appointment.tuteeEmail);
    }
    if (appointment.additionalAttendees) {
      attendees.push(...appointment.additionalAttendees);
    }
    
    const meetingRequest: CreateMeetingRequest = {
      startDateTime,
      endDateTime,
      subject: `Tutoring Session: ${appointment.subject}`,
      isPasscodeRequired: true, // For security
      accessToken: appointment.tutorAccessToken,
      attendees: attendees.length > 0 ? attendees : undefined
    };

    const result = await createTeamsMeeting(meetingRequest);
    
    if (result.success && result.meeting) {
      console.log('Teams meeting created:', result.meeting.joinUrl);
      return {
        success: true,
        meetingUrl: result.meeting.joinUrl,
        meetingId: result.meeting.id
      };
    } else {
      console.error('Failed to create Teams meeting:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error in createAppointmentTeamsMeeting:', error);
    return {
      success: false,
      error: 'Failed to create meeting'
    };
  }
}

// Example 2: Function to handle Teams meeting creation (for use in React components)
export async function handleTeamsMeetingCreation(
  appointment: { datetimeISO: string; subject: string },
  accessToken: string,
  onMeetingCreated: (meetingUrl: string) => void
) {
  const result = await createAppointmentTeamsMeeting({
    ...appointment,
    tutorAccessToken: accessToken
  });
  
  if (result.success && result.meetingUrl) {
    onMeetingCreated(result.meetingUrl);
  }
  
  return result;
}

// Example 3: Integration with your existing appointment system
export async function enhanceAppointmentWithTeamsMeeting(
  appointmentMessage: any, // Your existing appointment message
  tutorAccessToken: string
) {
  if (appointmentMessage.type === 'appointment' && appointmentMessage.appointment) {
    const meeting = await createAppointmentTeamsMeeting({
      datetimeISO: appointmentMessage.appointment.datetimeISO,
      subject: appointmentMessage.appointment.subject || 'Tutoring Session',
      tutorAccessToken
    });
    
    if (meeting.success) {
      // Add meeting URL to the appointment
      return {
        ...appointmentMessage,
        appointment: {
          ...appointmentMessage.appointment,
          meetingUrl: meeting.meetingUrl,
          meetingId: meeting.meetingId
        }
      };
    }
  }
  
  return appointmentMessage;
}

// Example 4: Advanced meeting creation with multiple attendees and roles
export async function createAdvancedTeamsMeeting({
  startDateTime,
  endDateTime,
  subject,
  organizer, // The person creating the meeting (tutor)
  tutee,     // Student attending
  observers = [], // Optional observers (parents, other tutors)
  accessToken
}: {
  startDateTime: string;
  endDateTime: string;
  subject: string;
  organizer: { email: string; name: string };
  tutee: { email: string; name: string };
  observers?: { email: string; name: string; role?: 'attendee' | 'presenter' }[];
  accessToken: string;
}) {
  const attendees = [
    tutee.email,
    ...observers.map(obs => obs.email)
  ];

  const meeting = await createTeamsMeeting({
    startDateTime,
    endDateTime,
    subject: `${subject} - ${organizer.name} & ${tutee.name}`,
    isPasscodeRequired: true,
    accessToken,
    attendees
  });

  return {
    ...meeting,
    attendeeInfo: {
      organizer,
      tutee,
      observers
    }
  };
}

// Example 5: Advanced recurring meeting creation with multiple patterns
export async function createRecurringTeamsMeetings({
  baseAppointment,
  recurrencePattern,
  tutorAccessToken,
  tuteeEmail,
  additionalAttendees = [],
  options = {}
}: {
  baseAppointment: {
    startDateTime: string; // First appointment date/time
    subject: string;
    duration?: number; // Duration in minutes, default 60
  };
  recurrencePattern: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    count: number; // How many meetings to create
    daysOfWeek?: number[]; // For weekly: [1,3,5] = Mon, Wed, Fri (0=Sunday, 6=Saturday)
    endDate?: string; // Alternative to count
  };
  tutorAccessToken: string;
  tuteeEmail: string;
  additionalAttendees?: string[];
  options?: {
    isPasscodeRequired?: boolean;
    delayBetweenCreations?: number; // ms delay to avoid rate limiting
    subjectPrefix?: string;
  };
}) {
  const {
    isPasscodeRequired = true,
    delayBetweenCreations = 200,
    subjectPrefix = "Session"
  } = options;

  const duration = baseAppointment.duration || 60;
  const meetings: Array<{
    sessionNumber: number;
    date: string;
    meeting: any | null;
    error: string | null;
  }> = [];

  // Generate all meeting dates based on recurrence pattern
  const meetingDates = generateRecurringDates(
    baseAppointment.startDateTime,
    recurrencePattern
  );

  console.log(`Creating ${meetingDates.length} recurring meetings...`);

  // Create meetings one by one
  for (let i = 0; i < meetingDates.length; i++) {
    const meetingDate = meetingDates[i];
    const sessionNumber = i + 1;
    
    try {
      const { startDateTime, endDateTime } = createMeetingTimes(new Date(meetingDate), duration);
      
      const meeting = await createTeamsMeeting({
        startDateTime,
        endDateTime,
        subject: `${subjectPrefix} ${sessionNumber}: ${baseAppointment.subject}`,
        isPasscodeRequired,
        accessToken: tutorAccessToken,
        attendees: [tuteeEmail, ...additionalAttendees]
      });
      
      meetings.push({
        sessionNumber,
        date: meetingDate,
        meeting: meeting.success ? meeting.meeting : null,
        error: meeting.success ? null : meeting.error || 'Unknown error'
      });

      console.log(`✅ Session ${sessionNumber} created for ${new Date(meetingDate).toLocaleDateString()}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      meetings.push({
        sessionNumber,
        date: meetingDate,
        meeting: null,
        error: errorMessage
      });

      console.error(`❌ Failed to create session ${sessionNumber}:`, errorMessage);
    }
    
    // Delay to avoid rate limiting
    if (i < meetingDates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenCreations));
    }
  }
  
  const successful = meetings.filter(m => m.meeting !== null).length;
  const failed = meetings.length - successful;
  
  console.log(`📊 Recurring meetings summary: ${successful} successful, ${failed} failed`);
  
  return {
    meetings,
    summary: {
      total: meetings.length,
      successful,
      failed,
      successRate: (successful / meetings.length) * 100
    }
  };
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDateString: string,
  pattern: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    count: number;
    daysOfWeek?: number[];
    endDate?: string;
  }
): string[] {
  const dates: string[] = [];
  const startDate = new Date(startDateString);
  
  // For count-based recurrence
  if (pattern.count) {
    for (let i = 0; i < pattern.count; i++) {
      const currentDate = new Date(startDate);
      
      switch (pattern.frequency) {
        case 'daily':
          currentDate.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          currentDate.setDate(startDate.getDate() + (i * 7));
          break;
        case 'biweekly':
          currentDate.setDate(startDate.getDate() + (i * 14));
          break;
        case 'monthly':
          currentDate.setMonth(startDate.getMonth() + i);
          break;
      }
      
      dates.push(currentDate.toISOString());
    }
  }
  
  // For weekly patterns with specific days
  if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    dates.length = 0; // Clear previous dates
    
    const weeksNeeded = Math.ceil(pattern.count / pattern.daysOfWeek.length);
    let sessionCount = 0;
    
    for (let week = 0; week < weeksNeeded && sessionCount < pattern.count; week++) {
      for (const dayOfWeek of pattern.daysOfWeek) {
        if (sessionCount >= pattern.count) break;
        
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7));
        
        // Adjust to the specific day of week
        const diff = dayOfWeek - currentDate.getDay();
        currentDate.setDate(currentDate.getDate() + diff);
        
        // Only add if it's not before the start date
        if (currentDate >= startDate) {
          dates.push(currentDate.toISOString());
          sessionCount++;
        }
      }
    }
  }
  
  return dates.sort();
}

// Example 6: Simple weekly recurring meetings (most common use case)
export async function createWeeklyTutoringMeetings({
  firstSessionDate,
  subject,
  numberOfWeeks,
  tutorAccessToken,
  tuteeEmail,
  sessionDuration = 60
}: {
  firstSessionDate: string; // ISO string of first session
  subject: string;
  numberOfWeeks: number;
  tutorAccessToken: string;
  tuteeEmail: string;
  sessionDuration?: number; // minutes
}) {
  return createRecurringTeamsMeetings({
    baseAppointment: {
      startDateTime: firstSessionDate,
      subject,
      duration: sessionDuration
    },
    recurrencePattern: {
      frequency: 'weekly',
      count: numberOfWeeks
    },
    tutorAccessToken,
    tuteeEmail,
    options: {
      subjectPrefix: 'Weekly Session',
      isPasscodeRequired: true
    }
  });
}

// Example 7: Create meetings for specific days (e.g., Mon-Wed-Fri schedule)
export async function createScheduledTutoringMeetings({
  startDate,
  subject,
  numberOfWeeks,
  daysOfWeek, // [1, 3, 5] for Mon, Wed, Fri
  tutorAccessToken,
  tuteeEmail,
  sessionTime = "14:30:00" // Time in HH:mm:ss format
}: {
  startDate: string; // YYYY-MM-DD format
  subject: string;
  numberOfWeeks: number;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  tutorAccessToken: string;
  tuteeEmail: string;
  sessionTime?: string;
}) {
  // Find the first occurrence of the first day in daysOfWeek
  const baseDate = new Date(`${startDate}T${sessionTime}`);
  const firstDay = daysOfWeek[0];
  const diff = firstDay - baseDate.getDay();
  if (diff > 0) {
    baseDate.setDate(baseDate.getDate() + diff);
  }
  
  const totalSessions = numberOfWeeks * daysOfWeek.length;
  
  return createRecurringTeamsMeetings({
    baseAppointment: {
      startDateTime: baseDate.toISOString(),
      subject,
      duration: 60
    },
    recurrencePattern: {
      frequency: 'weekly',
      count: totalSessions,
      daysOfWeek
    },
    tutorAccessToken,
    tuteeEmail,
    options: {
      subjectPrefix: 'Scheduled Session',
      delayBetweenCreations: 300 // Slightly longer delay for complex schedules
    }
  });
}