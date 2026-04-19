import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') as 'tutee' | 'tutor';
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const chatCollection = db.collection('chat');

    // Get all chats where the user is a participant
    // Handle both user ID formats (with and without user_ prefix)
    const userIdWithoutPrefix = userId.startsWith('user_') ? userId.replace('user_', '') : userId;
    const userIdWithPrefix = userId.startsWith('user_') ? userId : `user_${userId}`;
    
    // Get all conversations where user participated in the current role context
    // For tutee pages: show conversations that started when user was tutee OR are responses to user as tutee
    // For tutor pages: show conversations that started when user was tutor OR are responses to user as tutor
    const chats = await chatCollection
      .find({ 
        recipients: { 
          $in: [userId, userIdWithoutPrefix, userIdWithPrefix] 
        }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Filter conversations by role context
    const roleFilteredChats = chats.filter(chat => {
      const isUserSender = [userId, userIdWithoutPrefix, userIdWithPrefix].includes(chat.creatorId);
      
      if (isUserSender) {
        // If user sent the message, show it only on the page matching senderRole
        return chat.senderRole === role;
      } else {
        // If someone else sent to user, show on opposite role page
        // (tutee messages appear on tutor page, tutor messages appear on tutee page)
        return chat.senderRole !== role;
      }
    });
    return NextResponse.json({ chats: roleFilteredChats || [] });
  } catch (error) {
    console.error('Chat API - Error fetching chats:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch chats'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, message, recipients, replyTo, senderRole, type, appointment, quizResult } = body;

    if (!creatorId || !recipients || recipients.length === 0 || !senderRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const chatCollection = db.collection('chat');

    // Build message payload, supporting text, appointment, and quiz-result types
    const baseMessage = {
      creatorId,
      message: message ?? '',
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null,
      recipients: recipients,
      senderRole: senderRole as 'tutee' | 'tutor',
    };

    let newMessage: any = { ...baseMessage, type: (type ?? 'text') as 'text' | 'appointment' | 'quiz-result' };

    if (newMessage.type === 'appointment') {
      // Validate appointment payload
      if (!appointment || !appointment.datetimeISO || !appointment.mode) {
        return NextResponse.json({ error: 'Missing appointment details' }, { status: 400 });
      }

      newMessage.appointment = {
        appointmentType: appointment.appointmentType || 'single',
        endDate: appointment.endDate,
        selectedDates: Array.isArray(appointment.selectedDates)
          ? appointment.selectedDates
          : undefined,
        startDate: appointment.startDate || appointment.datetimeISO,
        datetimeISO: appointment.datetimeISO,
        durationMinutes: appointment.durationMinutes,
        mode: appointment.mode as 'online' | 'in-person',
        status: (appointment.status ?? 'pending') as 'pending' | 'accepted' | 'declined',
        subject: appointment.subject,
        offeringId: appointment.offeringId,
        meetingUrl: appointment.meetingUrl,
        meetingId: appointment.meetingId,
      };

      // Provide a default human-readable message for appointment
      const when = new Date(appointment.datetimeISO).toLocaleString();
      const modeLabel = appointment.mode === 'in-person' ? 'Onsite' : 'Online';
      newMessage.message = message ?? `Appointment proposed for ${when} (${modeLabel})`;
    } else if (newMessage.type === 'quiz-result') {
      // Validate quiz result payload
      if (!quizResult || !quizResult.appointmentId || !quizResult.attempt || quizResult.score === undefined) {
        return NextResponse.json({ error: 'Missing quiz result details' }, { status: 400 });
      }

      newMessage.quizResult = {
        appointmentId: quizResult.appointmentId,
        attempt: quizResult.attempt,
        score: quizResult.score,
        totalQuestions: quizResult.totalQuestions,
        completedAt: quizResult.completedAt,
        tuteeId: quizResult.tuteeId
      };

      // Provide a default human-readable message for quiz result
      const attemptType = quizResult.attempt === 1 ? 'Pre-session' : 'Post-session';
      newMessage.message = message ?? `${attemptType} quiz completed with ${quizResult.score}% score`;
    }

    const result = await chatCollection.insertOne(newMessage);

    const savedMessage = { _id: result.insertedId.toString(), ...newMessage };

    // Broadcast to Socket.IO server for real-time updates
    try {
      const socketResponse = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savedMessage)
      });
      
      if (!socketResponse.ok) {
        console.warn('Failed to broadcast message to Socket.IO server');
      }
    } catch (socketError) {
      console.warn('Error broadcasting to Socket.IO server:', socketError);
      // Don't fail the API request if socket broadcast fails
    }

    return NextResponse.json({ 
      success: true, 
      messageId: result.insertedId,
      message: savedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, status, actorId, declineReason, meetingUrl, meetingId } = body as {
      messageId?: string;
      status?: 'accepted' | 'declined' | 'cancelled';
      actorId?: string;
      declineReason?: string;
      meetingUrl?: string;
      meetingId?: string;
    };

    let resolvedMeetingUrl = meetingUrl?.trim() || null;
    let resolvedMeetingId = meetingId?.trim() || null;

    console.log('PATCH request received:', { messageId, status, actorId, declineReason, meetingUrl, meetingId });

    if (!messageId || !status) {
      return NextResponse.json({ error: 'Missing messageId or status' }, { status: 400 });
    }

    if ((status === 'accepted' || status === 'declined') && !actorId) {
      return NextResponse.json({ error: 'actorId is required for appointment responses' }, { status: 400 });
    }

    if (status === 'declined' && !declineReason?.trim()) {
      return NextResponse.json({ error: 'declineReason is required when declining an appointment' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('main');
    const chatCollection = db.collection('chat');

    // Debug: Let's see what messages exist
    const allMessages = await chatCollection.find({}).limit(5).toArray();
    console.log('Recent messages in DB:', allMessages.map(m => ({ _id: m._id, type: typeof m._id })));

    // Debug: Try to find the exact message first
    console.log('Attempting to find message with ID:', messageId);
    let exactMessage = null;
    let stringMessage = null;
    
    try {
      exactMessage = await chatCollection.findOne({ _id: new ObjectId(messageId) });
      console.log('ObjectId search result:', exactMessage ? 'FOUND' : 'NOT FOUND');
    } catch (e) {
      console.log('ObjectId search failed:', String(e));
    }
    
    try {
      stringMessage = await chatCollection.findOne({ _id: messageId } as any);
      console.log('String search result:', stringMessage ? 'FOUND' : 'NOT FOUND');
    } catch (e) {
      console.log('String search failed:', String(e));
    }

    if (exactMessage) {
      console.log('Found message via ObjectId:', {
        _id: exactMessage._id,
        type: exactMessage.type,
        hasAppointment: !!exactMessage.appointment
      });
    }

    if (stringMessage) {
      console.log('Found message via string:', {
        _id: stringMessage._id,
        type: stringMessage.type,
        hasAppointment: !!stringMessage.appointment
      });
    }

    // Deterministic meeting link: always use appointment/chat message ID as the room ID when accepted.
    if (status === 'accepted') {
      resolvedMeetingId = messageId.trim();
      resolvedMeetingUrl = `https://meet.jit.si/${resolvedMeetingId}`;
      console.log('Assigned deterministic Jitsi meeting for accepted appointment:', {
        messageId,
        meetingId: resolvedMeetingId,
        meetingUrl: resolvedMeetingUrl,
      });
    }

    // The message ID should be treated as an ObjectId since that's how MongoDB stores it
    let updated = null;
    
    try {
      const filter = { _id: new ObjectId(messageId) };
      const update = {
        $set: {
          'appointment.status': status,
          'appointment.actorId': actorId,
          'appointment.declineReason': status === 'declined' ? declineReason?.trim() : null,
          'appointment.meetingUrl': resolvedMeetingUrl,
          'appointment.meetingId': resolvedMeetingId,
          'updatedAt': new Date().toISOString(),
        }
      };

      console.log('Searching for message with filter:', filter);
      console.log('Update object:', update);
      
      updated = await chatCollection.findOneAndUpdate(
        filter, 
        update, 
        { returnDocument: 'after' }
      );
      
      console.log('findOneAndUpdate result type:', typeof updated);
      console.log('findOneAndUpdate result value:', updated ? 'HAS_VALUE' : 'NULL');
      
      if (updated) {
        console.log('Update successful! Message found and updated.');
        
        // If appointment is accepted or declined, save to appointments collection
        if (status === 'accepted' || status === 'declined') {
          const appointmentsCollection = db.collection('appointments');
          
          // Debug: Check what's in the appointment data
          console.log('Appointment data from message:', {
            subject: updated.appointment.subject,
            offeringId: updated.appointment.offeringId,
            fullAppointment: updated.appointment
          });

          // Try to get subject/offering from inquiry if missing in the appointment message
          let subject = updated.appointment.subject || null;
          let offeringId = updated.appointment.offeringId || null;
          
          // If subject or offering is not available, try to find it from inquiries collection
          if (!subject || !offeringId) {
            try {
              const inquiriesCollection = db.collection('inquiries');
              const inquiry = await inquiriesCollection.findOne({
                $or: [
                  { tutorId: updated.creatorId, tuteeId: actorId },
                  { tutorId: actorId, tuteeId: updated.creatorId }
                ]
              });

              if (inquiry) {
                subject = subject || inquiry.subject;
                offeringId = offeringId || inquiry.offeringId || null;
                console.log('Found subject/offering from inquiry:', {
                  subject,
                  offeringId,
                });
              }
            } catch (inquiryError) {
              console.warn('Could not fetch inquiry for subject:', inquiryError);
            }
          }

          const isCreatedByTutor = updated.senderRole === 'tutor';
          const tutorId = isCreatedByTutor ? updated.creatorId : actorId;
          const tuteeId = isCreatedByTutor ? actorId : updated.creatorId;

          // Build dates array for new format (array of date strings)
          let datesArray: string[] = [];
          const appointmentType = updated.appointment.appointmentType || 'single';
          
          if (appointmentType === 'recurring' && Array.isArray(updated.appointment.selectedDates)) {
            // For recurring appointments, use selectedDates as the dates array
            datesArray = updated.appointment.selectedDates;
          } else {
            // For single appointments, extract date from datetimeISO
            try {
              const dateObj = new Date(updated.appointment.datetimeISO);
              if (!isNaN(dateObj.getTime())) {
                const dateString = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                datesArray = [dateString];
              }
            } catch (e) {
              console.warn('Failed to extract date from datetimeISO:', updated.appointment.datetimeISO);
            }
          }

          // Create appointment record
          const appointmentRecord = {
            messageId: updated._id.toString(),
            tutorId,
            tuteeId,
            status: status, // 'accepted' or 'declined'
            declineReason: status === 'declined' ? declineReason?.trim() : null,
            meetingUrl: resolvedMeetingUrl,
            meetingId: resolvedMeetingId,
            appointmentType: appointmentType,
            datetimeISO: updated.appointment.datetimeISO,
            endDate: updated.appointment.endDate,
            selectedDates: updated.appointment.selectedDates,
            durationMinutes: updated.appointment.durationMinutes,
            dates: datesArray, // New format: array of date strings
            mode: updated.appointment.mode,
            subject: subject, // Save subject information from inquiry
            offeringId: offeringId, // Save offering ID if available
            quiz: [], // Empty array initially - will be populated later
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Check if appointment already exists to avoid duplicates
          const existingAppointment = await appointmentsCollection.findOne({
            messageId: updated._id.toString()
          });
          
          if (!existingAppointment) {
            await appointmentsCollection.insertOne(appointmentRecord);
            console.log('Appointment record created:', appointmentRecord);
          } else {
            // Update existing record if status changed
            await appointmentsCollection.updateOne(
              { messageId: updated._id.toString() },
              { 
                $set: { 
                  status: status,
                  declineReason: status === 'declined' ? declineReason?.trim() : null,
                  meetingUrl: resolvedMeetingUrl,
                  meetingId: resolvedMeetingId,
                  subject: subject,
                  offeringId: offeringId,
                  updatedAt: new Date().toISOString()
                }
              }
            );
            console.log('Appointment record updated:', status);
          }
        }
        
        // Return updated message in the same shape used by client  
        const savedMessage = { ...updated, _id: updated._id.toString() };
        
        // Broadcast to Socket.IO server for real-time updates
        try {
          const socketResponse = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/broadcast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(savedMessage)
          });
          
          if (!socketResponse.ok) {
            console.warn('Failed to broadcast appointment update to Socket.IO server');
          }
        } catch (socketError) {
          console.warn('Error broadcasting appointment update to Socket.IO server:', socketError);
          // Don't fail the API request if socket broadcast fails
        }
        
        return NextResponse.json({ success: true, message: savedMessage });
      } else {
        console.log('Update failed: Message not found with ObjectId filter');
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PATCH handler:', error);
    return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
  }
}