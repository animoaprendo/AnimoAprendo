import { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get('id');

    if (!offeringId) {
      return Response.json({ success: false, error: 'Offering ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection('subjects');

    // Convert string ID to ObjectId
    const offering = await collection.findOne({ _id: new ObjectId(offeringId) });

    if (!offering) {
      return Response.json({ success: false, error: 'Offering not found' }, { status: 404 });
    }

    // Get user details and ratings for the offering
    const usersCollection = db.collection('users');
    const reviewsCollection = db.collection('reviews');
    
    const user = await usersCollection.findOne({ 
      $or: [
        { _id: offering.userId },
        { id: offering.userId },
        { _id: `user_${offering.userId}` },
        { id: `user_${offering.userId}` }
      ]
    });

    // Calculate average rating for this tutor from tutee reviews
    const tutorReviews = await reviewsCollection.find({
      tutorId: offering.userId,
      reviewerType: 'tutee' // Only tutee ratings of tutors
    }).toArray();

    let averageRating = 0;
    if (tutorReviews.length > 0) {
      const totalRating = tutorReviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = totalRating / tutorReviews.length;
    }

    const result = {
      ...offering,
      _id: offering._id.toString(),
      averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0, // Round to 1 decimal
      totalReviews: tutorReviews.length,
      user: user ? {
        id: user.id || user._id,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        username: user.username,
        imageUrl: user.image_url || user.profile_image_url || user.imageUrl,
        displayName: (user.first_name && user.last_name) 
          ? `${user.first_name} ${user.last_name}`.trim() 
          : user.username || 'Anonymous'
      } : null
    };

    return Response.json({ success: true, data: result });

  } catch (error) {
    console.error('Error fetching offering:', error);
    return Response.json({ success: false, error: 'Failed to fetch offering' }, { status: 500 });
  }
}