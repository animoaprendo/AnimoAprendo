import { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  console.log('Poll route accessed!');
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');
  const since = searchParams.get('since');

  console.log('Poll params:', { userId, role, since });

  if (!userId || !role) {
    return new Response('userId and role are required', { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('animoaprendo');
    
    // Query for messages since the given timestamp
    const sinceTime = since ? parseInt(since) : Date.now() - 60000; // Default to last minute
    
    const messages = await db.collection('chats').find({
      // Get messages where user is participant and message is newer than since time
      participants: userId,
      timestamp: { $gt: sinceTime },
      // Only get messages from the opposite role
      senderRole: role === 'tutee' ? 'tutor' : 'tutee'
    }).sort({ timestamp: 1 }).toArray();

    return Response.json({
      messages: messages.map((msg: any) => ({
        ...msg,
        _id: msg._id.toString()
      }))
    });

  } catch (error) {
    console.error('Error polling messages:', error);
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}