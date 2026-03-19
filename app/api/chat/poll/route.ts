import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');
  const since = searchParams.get('since');

  if (!userId || !role) {
    return NextResponse.json(
      { error: 'userId and role are required' },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const userIdWithoutPrefix = userId.startsWith('user_')
      ? userId.replace('user_', '')
      : userId;
    const userIdWithPrefix = userId.startsWith('user_') ? userId : `user_${userId}`;
    const userIdVariations = [userId, userIdWithoutPrefix, userIdWithPrefix];

    // Chat messages use ISO createdAt strings; convert since ms into ISO for proper filtering.
    const sinceTime = since ? Number.parseInt(since, 10) : Date.now() - 60000;
    const sinceIso = new Date(Number.isNaN(sinceTime) ? Date.now() - 60000 : sinceTime).toISOString();

    const messages = await db
      .collection('chat')
      .find({
        recipients: { $in: userIdVariations },
        createdAt: { $gt: sinceIso },
        senderRole: role === 'tutee' ? 'tutor' : 'tutee',
        creatorId: { $nin: userIdVariations },
      })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      messages: messages.map((msg: any) => ({
        ...msg,
        _id: msg._id.toString(),
        timestamp: new Date(msg.createdAt).getTime(),
      })),
    });

  } catch (error) {
    console.error('Error polling messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}