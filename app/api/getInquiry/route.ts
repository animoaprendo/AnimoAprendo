import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
  let tuteeId = searchParams.get('tuteeId');
  let tutorId = searchParams.get('tutorId');
  const offeringId = searchParams.get('offeringId');

    if (!tuteeId || !tutorId) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { success: false, error: 'Missing tuteeId or tutorId' },
        { status: 400 }
      );
    }

  // Normalize user IDs to always include 'user_' prefix
  const normalizeId = (id: string) => (id?.startsWith('user_') ? id : `user_${id}`);
  tuteeId = normalizeId(tuteeId!);
  tutorId = normalizeId(tutorId!);

  const client = await clientPromise;
    const db = client.db('main');
    
    // Build query - if offeringId provided, include it for more specific matching
    const query: any = {
      tuteeId,
      tutorId,
      status: 'active'
    };
    
    if (offeringId) {
      query.offeringId = offeringId;
    }
    
    // Find active inquiry between this tutee and tutor (optionally for specific offering)
    const inquiry = await db.collection('inquiries').findOne(query);

    if (!inquiry) {
      console.log('No inquiry found, returning null');
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inquiry' },
      { status: 500 }
    );
  }
}