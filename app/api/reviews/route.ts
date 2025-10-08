import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, rating, comment, reviewerId } = body;

    if (!appointmentId || !rating || !reviewerId) {
      return NextResponse.json({ 
        error: 'appointmentId, rating, and reviewerId are required' 
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const reviewsCollection = db.collection('reviews');
    const appointmentsCollection = db.collection('appointments');

    // Verify the appointment exists and belongs to the reviewer (as tutor OR tutee)
    const appointment = await appointmentsCollection.findOne({ 
      _id: new ObjectId(appointmentId),
      $or: [
        { tutorId: reviewerId }, // Tutor reviewing tutee
        { tuteeId: reviewerId }  // Tutee reviewing tutor
      ]
    });

    if (!appointment) {
      return NextResponse.json({ 
        error: 'Appointment not found or not authorized' 
      }, { status: 404 });
    }

    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Appointment must be completed before rating' 
      }, { status: 400 });
    }

    // Determine if this is a tutor or tutee review
    const isTutorReview = appointment.tutorId === reviewerId;
    const isTuteeReview = appointment.tuteeId === reviewerId;

    // Check if review already exists for this reviewer and appointment
    const existingReview = await reviewsCollection.findOne({ 
      appointmentId: appointmentId,
      reviewerId: reviewerId
    });

    if (existingReview) {
      const reviewType = isTutorReview ? 'tutor' : 'tutee';
      return NextResponse.json({ 
        error: `Review already exists for this appointment by ${reviewType}` 
      }, { status: 400 });
    }

    // Create the review
    const review = {
      appointmentId,
      rating: Number(rating),
      comment: comment || '',
      reviewerId,
      reviewerType: isTutorReview ? 'tutor' : 'tutee',
      tutorId: appointment.tutorId,
      tuteeId: appointment.tuteeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await reviewsCollection.insertOne(review);
    
    // Update the appointment to mark it as reviewed
    const updateFields: any = {
      updatedAt: new Date().toISOString()
    };

    if (isTutorReview) {
      updateFields.tutorRated = true;
      updateFields.tuteeRating = Number(rating);
    } else {
      updateFields.tuteeRated = true;
      updateFields.tutorRating = Number(rating);
    }

    await appointmentsCollection.updateOne(
      { _id: new ObjectId(appointmentId) },
      { $set: updateFields }
    );

    return NextResponse.json({ 
      success: true, 
      review: {
        ...review,
        _id: result.insertedId.toString()
      }
    });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ 
      error: 'Failed to create review' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const reviewerId = searchParams.get('reviewerId');

    if (!appointmentId && !reviewerId) {
      return NextResponse.json({ 
        error: 'Either appointmentId or reviewerId is required' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("main");
    const reviewsCollection = db.collection('reviews');

    let query: any = {};
    
    if (appointmentId) {
      query.appointmentId = appointmentId;
    }
    
    if (reviewerId) {
      query.reviewerId = reviewerId;
    }

    const reviews = await reviewsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ 
      success: true, 
      reviews: reviews.map(review => ({
        ...review,
        _id: review._id.toString()
      }))
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch reviews' 
    }, { status: 500 });
  }
}