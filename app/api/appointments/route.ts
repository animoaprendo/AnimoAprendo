import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// Question type based on QuizEditor.tsx
type Question = {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "fill-in";
  options: string[];
  answer: string | string[];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const messageId = searchParams.get('messageId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const appointmentsCollection = db.collection('appointments');

    let query: any = {};
    
    if (messageId) {
      // Get specific appointment
      query = { messageId };
    } else {
      // Get all appointments for user (as tutor or tutee)
      query = {
        $or: [
          { tutorId: userId },
          { tuteeId: userId }
        ]
      };
    }

    const appointments = await appointmentsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ 
      success: true, 
      appointments: appointments.map(apt => ({
        ...apt,
        _id: apt._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle quiz updates (by tutor)
    if (body.quiz !== undefined) {
      const { messageId, quiz, userId } = body as { 
        messageId: string; 
        quiz: Question[]; 
        userId: string; 
      };

      if (!messageId || !userId) {
        return NextResponse.json({ error: 'messageId and userId are required' }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection('appointments');

      // Update the quiz for the appointment
      const updated = await appointmentsCollection.findOneAndUpdate(
        { 
          messageId: messageId,
          tutorId: userId // Only the tutor can update the quiz
        },
        {
          $set: {
            quiz: quiz || [],
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        appointment: { ...updated, _id: updated._id.toString() }
      });
    }

    // Handle quiz attempts (by tutee)
    if (body.quizAttempt !== undefined) {
      const { messageId, quizAttempt } = body;

      if (!messageId || !quizAttempt) {
        return NextResponse.json({ error: 'messageId and quizAttempt are required' }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection('appointments');

      // Add quiz attempt to the appointment
      const updated = await appointmentsCollection.findOneAndUpdate(
        { 
          messageId: messageId,
          tuteeId: quizAttempt.tuteeId // Only the tutee can add their quiz attempt
        },
        {
          $push: {
            quizAttempts: quizAttempt
          },
          $set: {
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        appointment: { ...updated, _id: updated._id.toString() }
      });
    }

    // Handle status updates (by tutor)
    if (body.status !== undefined) {
      const { messageId, status, userId } = body;

      if (!messageId || !status || !userId) {
        return NextResponse.json({ error: 'messageId, status, and userId are required' }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db("main");
      const appointmentsCollection = db.collection('appointments');

      // Update appointment status
      const updated = await appointmentsCollection.findOneAndUpdate(
        { 
          messageId: messageId,
          tutorId: userId // Only the tutor can update status
        },
        {
          $set: {
            status: status,
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        appointment: { ...updated, _id: updated._id.toString() }
      });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}