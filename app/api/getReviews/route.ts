import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get('offeringId');

    if (!offeringId) {
      return Response.json({ success: false, error: 'Offering ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('main');
    const reviewsCollection = db.collection('reviews');
    const subjectsCollection = db.collection('subjects');

    // First get the offering to find the tutor
    const offering = await subjectsCollection.findOne({
      _id: new ObjectId(offeringId)
    });

    if (!offering) {
      return Response.json({ success: false, error: 'Offering not found' }, { status: 404 });
    }

    // Find tutee reviews for this tutor (ratings of the tutor by their students)
    const reviews = await reviewsCollection
      .find({ 
        offerId: offeringId,
        reviewerType: 'tutee' // Only tutee reviews of tutors
      })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Get user details for each review
    const usersCollection = db.collection('users');
    const reviewsWithUsers = await Promise.all(
      reviews.map(async (review) => {
        const user = await usersCollection.findOne({ 
          $or: [
            { id: review.reviewerId },
            { _id: review.reviewerId }
          ]
        });
        return {
          ...review,
          _id: review._id.toString(),
          reviewer: user ? {
            id: user.id || user._id,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            username: user.username,
            imageUrl: user.image_url || user.profile_image_url || user.imageUrl,
            displayName: (user.first_name && user.last_name) 
              ? `${user.first_name} ${user.last_name}`.trim() 
              : user.username || 'Anonymous User'
          } : {
            id: review.reviewerId,
            displayName: 'Anonymous User',
            imageUrl: 'https://i.pravatar.cc/100?img=1'
          }
        };
      })
    );

    return Response.json({ success: true, data: reviewsWithUsers });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return Response.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}