// Example usage of Jitsi integration
// This can be integrated into your appointment creation or chat system

import { createJitsiMeeting, createMeetingTimes } from '@/lib/google-meet';

type BaseAppointment = {
  datetimeISO: string;
  subject: string;
};

type MeetingResult = {
  success: boolean;
  meetingUrl?: string;
  meetingId?: string;
  error?: string;
  warning?: string;
  appointment?: any;
  meeting?: any;
  meetingError?: string;
};

export async function createAppointmentGoogleMeetMeeting(appointment: {
  datetimeISO: string;
  subject: string;
  tuteeEmail?: string;
  additionalAttendees?: string[];
}): Promise<MeetingResult> {
  try {
    const appointmentDate = new Date(appointment.datetimeISO);
    const { startDateTime, endDateTime } = createMeetingTimes(appointmentDate, 60);

    const attendees: string[] = [];
    if (appointment.tuteeEmail) {
      attendees.push(appointment.tuteeEmail);
    }
    if (appointment.additionalAttendees) {
      attendees.push(...appointment.additionalAttendees);
    }

    const result = await createJitsiMeeting({
      startDateTime,
      endDateTime,
      subject: `Tutoring Session: ${appointment.subject}`,
      attendees: attendees.length > 0 ? attendees : undefined,
    });

    if (result.success && result.meeting) {
      console.log('Jitsi link created:', result.meeting.joinUrl);
      return {
        success: true,
        meetingUrl: result.meeting.joinUrl,
        meetingId: result.meeting.id,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to create Jitsi meeting',
    };
  } catch (error) {
    console.error('Error in createAppointmentGoogleMeetMeeting:', error);
    return {
      success: false,
      error: 'Failed to create meeting',
    };
  }
}

export async function handleGoogleMeetCreation(
  appointment: BaseAppointment,
  _accessToken: string,
  onMeetingCreated: (meetingUrl: string) => void
) {
  const result = await createAppointmentGoogleMeetMeeting({
    ...appointment,
  });

  if (result.success && result.meetingUrl) {
    onMeetingCreated(result.meetingUrl);
  }

  return result;
}

export async function enhanceAppointmentWithGoogleMeet(
  appointmentMessage: any,
  _tutorAccessToken: string
) {
  if (appointmentMessage.type === 'appointment' && appointmentMessage.appointment) {
    const meeting = await createAppointmentGoogleMeetMeeting({
      datetimeISO: appointmentMessage.appointment.datetimeISO,
      subject: appointmentMessage.appointment.subject || 'Tutoring Session',
    });

    if (meeting.success) {
      return {
        ...appointmentMessage,
        appointment: {
          ...appointmentMessage.appointment,
          meetingUrl: meeting.meetingUrl,
          meetingId: meeting.meetingId,
        },
      };
    }
  }

  return appointmentMessage;
}

export async function createAdvancedGoogleMeetMeeting({
  startDateTime,
  endDateTime,
  subject,
  organizer,
  tutee,
  observers = [],
}: {
  startDateTime: string;
  endDateTime: string;
  subject: string;
  organizer: { email: string; name: string };
  tutee: { email: string; name: string };
  observers?: { email: string; name: string; role?: 'attendee' | 'presenter' }[];
}) {
  const attendees = [
    tutee.email,
    ...observers.map((obs) => obs.email),
  ];

  const meeting = await createJitsiMeeting({
    startDateTime,
    endDateTime,
    subject: `${subject} - ${organizer.name} & ${tutee.name}`,
    attendees,
  });

  return {
    ...meeting,
    attendeeInfo: {
      organizer,
      tutee,
      observers,
    },
  };
}

export async function createRecurringGoogleMeetMeetings({
  baseAppointment,
  recurrencePattern,
  tuteeEmail,
  additionalAttendees = [],
  options = {},
}: {
  baseAppointment: {
    startDateTime: string;
    subject: string;
    duration?: number;
  };
  recurrencePattern: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    count: number;
    daysOfWeek?: number[];
    endDate?: string;
  };
  tuteeEmail: string;
  additionalAttendees?: string[];
  options?: {
    delayBetweenCreations?: number;
    subjectPrefix?: string;
  };
}) {
  const {
    delayBetweenCreations = 200,
    subjectPrefix = 'Session',
  } = options;

  const duration = baseAppointment.duration || 60;
  const meetings: Array<{
    sessionNumber: number;
    date: string;
    meeting: any | null;
    error: string | null;
  }> = [];

  const meetingDates = generateRecurringDates(
    baseAppointment.startDateTime,
    recurrencePattern
  );

  for (let i = 0; i < meetingDates.length; i++) {
    const meetingDate = meetingDates[i];
    const sessionNumber = i + 1;

    try {
      const { startDateTime, endDateTime } = createMeetingTimes(new Date(meetingDate), duration);

      const meeting = await createJitsiMeeting({
        startDateTime,
        endDateTime,
        subject: `${subjectPrefix} ${sessionNumber}: ${baseAppointment.subject}`,
        attendees: [tuteeEmail, ...additionalAttendees],
      });

      meetings.push({
        sessionNumber,
        date: meetingDate,
        meeting: meeting.success ? meeting.meeting : null,
        error: meeting.success ? null : meeting.error || 'Unknown error',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      meetings.push({
        sessionNumber,
        date: meetingDate,
        meeting: null,
        error: errorMessage,
      });
    }

    if (i < meetingDates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenCreations));
    }
  }

  const successful = meetings.filter((m) => m.meeting !== null).length;
  const failed = meetings.length - successful;

  return {
    meetings,
    summary: {
      total: meetings.length,
      successful,
      failed,
      successRate: meetings.length === 0 ? 0 : (successful / meetings.length) * 100,
    },
  };
}

export async function createWeeklyTutoringMeetings({
  firstSessionDate,
  subject,
  numberOfWeeks,
  tuteeEmail,
  sessionDuration = 60,
}: {
  firstSessionDate: string;
  subject: string;
  numberOfWeeks: number;
  tuteeEmail: string;
  sessionDuration?: number;
}) {
  return createRecurringGoogleMeetMeetings({
    baseAppointment: {
      startDateTime: firstSessionDate,
      subject,
      duration: sessionDuration,
    },
    recurrencePattern: {
      frequency: 'weekly',
      count: numberOfWeeks,
    },
    tuteeEmail,
    options: {
      subjectPrefix: 'Weekly Session',
    },
  });
}

export async function createScheduledTutoringMeetings({
  startDate,
  subject,
  numberOfWeeks,
  daysOfWeek,
  tuteeEmail,
  sessionTime = '14:30:00',
}: {
  startDate: string;
  subject: string;
  numberOfWeeks: number;
  daysOfWeek: number[];
  tuteeEmail: string;
  sessionTime?: string;
}) {
  const baseDate = new Date(`${startDate}T${sessionTime}`);
  const firstDay = daysOfWeek[0];
  const diff = firstDay - baseDate.getDay();
  if (diff > 0) {
    baseDate.setDate(baseDate.getDate() + diff);
  }

  const totalSessions = numberOfWeeks * daysOfWeek.length;

  return createRecurringGoogleMeetMeetings({
    baseAppointment: {
      startDateTime: baseDate.toISOString(),
      subject,
      duration: 60,
    },
    recurrencePattern: {
      frequency: 'weekly',
      count: totalSessions,
      daysOfWeek,
    },
    tuteeEmail,
    options: {
      subjectPrefix: 'Scheduled Session',
      delayBetweenCreations: 300,
    },
  });
}

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

  if (pattern.count) {
    for (let i = 0; i < pattern.count; i++) {
      const currentDate = new Date(startDate);

      switch (pattern.frequency) {
        case 'daily':
          currentDate.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          currentDate.setDate(startDate.getDate() + i * 7);
          break;
        case 'biweekly':
          currentDate.setDate(startDate.getDate() + i * 14);
          break;
        case 'monthly':
          currentDate.setMonth(startDate.getMonth() + i);
          break;
      }

      dates.push(currentDate.toISOString());
    }
  }

  if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    dates.length = 0;

    const weeksNeeded = Math.ceil(pattern.count / pattern.daysOfWeek.length);
    let sessionCount = 0;

    for (let week = 0; week < weeksNeeded && sessionCount < pattern.count; week++) {
      for (const dayOfWeek of pattern.daysOfWeek) {
        if (sessionCount >= pattern.count) break;

        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7);

        const diff = dayOfWeek - currentDate.getDay();
        currentDate.setDate(currentDate.getDate() + diff);

        if (currentDate >= startDate) {
          dates.push(currentDate.toISOString());
          sessionCount++;
        }
      }
    }
  }

  return dates.sort();
}