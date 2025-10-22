import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface UserDocument {
  _id: string;
  id?: string; // Clerk format with user_ prefix
  first_name?: string;
  last_name?: string;
  username?: string;
  email_addresses?: Array<{
    email_address: string;
  }>;
  profile_image_url?: string;
  image_url?: string; // Alternative field name
}

export async function GET(request: NextRequest) { 
  try {
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds');
    
    if (!userIds) {
      return NextResponse.json({ error: 'userIds parameter is required' }, { status: 400 });
    }

    const userIdArray = userIds.split(',');

    const client = await clientPromise;
    const db = client.db("main");
    const usersCollection = db.collection<UserDocument>('users');

    // Create arrays for both formats
    const userIdsWithPrefix = userIdArray.map(id => id.startsWith('user_') ? id : `user_${id}`);
    const userIdsWithoutPrefix = userIdArray.map(id => id.replace('user_', ''));

    // Check what's in the users collection
    const sampleUser = await usersCollection.findOne({});
    
    // Try to find the specific user directly
    const userById = await usersCollection.findOne({ _id: userIdsWithoutPrefix[0] });
    
    const userByIdField = await usersCollection.findOne({ id: userIdsWithPrefix[0] });

    // Get user data for the provided user IDs (search both _id and id fields)
    const users = await usersCollection
      .find({ 
        $or: [
          { _id: { $in: userIdsWithoutPrefix } },
          { id: { $in: userIdsWithPrefix } }
        ]
      })
      .toArray();

    // Transform user data to include display names
    const transformedUsers = users.map(user => ({
      id: user.id || user._id, // Use id field if available, otherwise _id
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      emailAddress: user.email_addresses?.[0]?.email_address || '',
      imageUrl: user.image_url || user.profile_image_url, // Handle both field names
      displayName: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`
        : user.username || user.email_addresses?.[0]?.email_address || 'Unknown User'
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}