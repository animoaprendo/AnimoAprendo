import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { tuteeId, tutorId, offeringId, subject, banner, description } = body;

    // Only IDs are required; details are hydrated from the offering document
    if (!tuteeId || !tutorId || !offeringId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Normalize user IDs to always include 'user_' prefix
    const normalizeId = (id: string) => (id?.startsWith('user_') ? id : `user_${id}`);
    tuteeId = normalizeId(tuteeId);
    tutorId = normalizeId(tutorId);

    const client = await clientPromise;
    const db = client.db('main');
    const subjects = db.collection('subjects');

    // Authoritative offering fetch
    let offeringDoc: any = null;
    try {
      offeringDoc = await subjects.findOne({ _id: new ObjectId(offeringId) });
    } catch (e) {
      // offeringId might not be a valid ObjectId; leave as null
    }

    if (!offeringDoc) {
      return NextResponse.json(
        { success: false, error: 'Offering not found' },
        { status: 404 }
      );
    }

  // Overwrite details with offering data
  const offeringSubject = offeringDoc.subject ?? subject ?? 'Untitled';
  const offeringBanner = offeringDoc.banner ?? banner ?? '';
  const offeringDescription = offeringDoc.description ?? description ?? '';
    // Prefer tutorId from offering for consistency
    const offeringTutorId = normalizeId(String(offeringDoc.userId ?? tutorId));
    tutorId = offeringTutorId;
    
    // Upsert inquiry and always refresh the subject/banner/description details
    const now = new Date().toISOString();
    const updateResult = await db.collection('inquiries').findOneAndUpdate(
      { tuteeId, tutorId, offeringId, status: 'active' },
      {
        $set: {
          subject: offeringSubject,
          banner: offeringBanner,
          description: offeringDescription,
          updatedAt: now,
        },
        $setOnInsert: {
          tuteeId,
          tutorId,
          offeringId,
          status: 'active',
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    let updated = (updateResult as any).value;
    if (!updated) {
      updated = await db.collection('inquiries').findOne({ tuteeId, tutorId, offeringId, status: 'active' });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create inquiry' },
      { status: 500 }
    );
  }
}