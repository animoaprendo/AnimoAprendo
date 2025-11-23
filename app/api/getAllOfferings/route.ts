import { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('main');
    const subjectsCollection = db.collection('subjects');
    const usersCollection = db.collection('users');

    // Fetch all subjects/offerings with status "available"
    const offerings = await subjectsCollection
      .find({ status: 'available' })
      .sort({ 
        createdAt: -1, // Most recent first
        _id: -1 // Fallback to ObjectId creation time if createdAt is missing
      })
      .toArray();

    // Get collections for rating calculations
    const reviewsCollection = db.collection('reviews');
    const appointmentsCollection = db.collection('appointments');

    // Get user details and ratings for each offering
    const offeringsWithUsers = await Promise.all(
      offerings.map(async (offering) => {
        // Look for user by both _id and id fields to handle different ID formats
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
          offerId: offering._id.toString(),
          reviewerType: 'tutee' // Only tutee ratings of tutors
        }).toArray();

        let averageRating = 0;
        if (tutorReviews.length > 0) {
          const totalRating = tutorReviews.reduce((sum, review) => sum + review.rating, 0);
          averageRating = totalRating / tutorReviews.length;
        }

        return {
          ...offering,
          _id: offering._id.toString(),
          averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0, // Round to 1 decimal
          totalReviews: tutorReviews.length,
          createdAt: offering.createdAt, // Include createdAt for sorting
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
      })
    );

    // Sort offerings by rating (highest first, treating null/undefined as 0)
    // Then by creation date (oldest first) for same ratings
    const sortedOfferings = offeringsWithUsers.sort((a, b) => {
      const aRating = a.averageRating || 0;
      const bRating = b.averageRating || 0;
      
      // Primary sort: by rating (highest first)
      if (bRating !== aRating) {
        return bRating - aRating;
      }
      
      // Secondary sort: by creation date (oldest first) for same ratings
      const aDate = new Date(a.createdAt || a._id).getTime(); // Fallback to ObjectId if no createdAt
      const bDate = new Date(b.createdAt || b._id).getTime();
      return aDate - bDate; // oldest first
    });



    return Response.json({ success: true, data: sortedOfferings });

  } catch (error) {
    console.error('Error fetching all offerings:', error);
    return Response.json({ success: false, error: 'Failed to fetch offerings' }, { status: 500 });
  }
}