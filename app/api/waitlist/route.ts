import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

async function connectToDatabase() {
  const client = await clientPromise;
  return client.db('animoaprendo');
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json(
        { message: 'Email address is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await connectToDatabase();
    const waitlistCollection = db.collection('waitlist');

    // Check if email already exists
    const existingEntry = await waitlistCollection.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingEntry) {
      return NextResponse.json(
        { message: 'This email is already on the waitlist' },
        { status: 409 }
      );
    }

    // Add to waitlist
    const waitlistEntry = {
      email: email.toLowerCase().trim(),
      createdAt: new Date(),
      source: 'waitlist_page',
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    await waitlistCollection.insertOne(waitlistEntry);

    // Log success for monitoring
    console.log(`New waitlist signup: ${email}`);

    return NextResponse.json(
      { 
        message: 'Successfully joined the waitlist!',
        email: email.toLowerCase().trim()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Waitlist API Error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve waitlist count (for admin use)
export async function GET(request: NextRequest) {
  try {
    // This could be restricted to admin users only
    const db = await connectToDatabase();
    const waitlistCollection = db.collection('waitlist');
    
    const count = await waitlistCollection.countDocuments();
    const recentSignups = await waitlistCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      totalSignups: count,
      recentSignups: recentSignups.map(signup => ({
        email: signup.email,
        createdAt: signup.createdAt,
        source: signup.source
      }))
    });

  } catch (error) {
    console.error('Waitlist GET API Error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}