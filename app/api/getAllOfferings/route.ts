import { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { calculateAvailabilityDiversity } from '@/lib/subject-sorting';

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

    // Get collections for rating calculations and booking statistics
    const reviewsCollection = db.collection('reviews');
    const appointmentsCollection = db.collection('appointments');

    // Get user details, ratings, and booking stats for each offering
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

        const userCollegeInfo =
          user?.public_metadata?.collegeInformation ||
          user?.publicMetadata?.collegeInformation ||
          null;
        const tutorYearLevel = Number(userCollegeInfo?.yearLevel || 0) || undefined;

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

        // Get booking statistics for this offering
        
        // Repeat Bookings: Count unique tutees who booked this offering 2+ times
        const allAppointmentsForOffering = await appointmentsCollection.find({
          offeringId: offering._id.toString(),
          status: { $in: ['accepted', 'completed'] }
        }).toArray();

        const tuteeBookingCounts = new Map<string, number>();
        allAppointmentsForOffering.forEach(apt => {
          const tuteeId = apt.tuteeId;
          if (tuteeId) {
            tuteeBookingCounts.set(tuteeId, (tuteeBookingCounts.get(tuteeId) || 0) + 1);
          }
        });
        const repeatBookingsCount = Array.from(tuteeBookingCounts.values())
          .filter(count => count >= 2).length;

        // Booking Frequency: Count bookings in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAppointments = await appointmentsCollection.countDocuments({
          offeringId: offering._id.toString(),
          status: { $in: ['accepted', 'completed'] },
          $or: [
            { createdAt: { $gte: thirtyDaysAgo } },
            { startDate: { $gte: thirtyDaysAgo.toISOString() } },
            { datetimeISO: { $gte: thirtyDaysAgo.toISOString() } }
          ]
        });
        const totalBookingsCount = recentAppointments;

        // Calculate availability diversity (unique days)
        const availabilityCount = calculateAvailabilityDiversity(offering.availability);

        return {
          ...offering,
          _id: offering._id.toString(),
          averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0, // Round to 1 decimal
          totalReviews: tutorReviews.length,
          createdAt: offering.createdAt, // Include createdAt for sorting
          // Booking statistics for weighted sorting
          totalBookingsCount,
          repeatBookingsCount,
          availabilityCount,
          user: user ? {
            id: user.id || user._id,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            username: user.username,
            imageUrl: user.image_url || user.profile_image_url || user.imageUrl,
            collegeInformation: userCollegeInfo,
            displayName: (user.first_name && user.last_name) 
              ? `${user.first_name} ${user.last_name}`.trim() 
              : user.username || 'Anonymous'
          } : null,
          tutorYearLevel,
        };
      })
    );

    // Note: Sorting is now handled by the weighted algorithm in the client
    // We return unsorted data to allow flexible sorting on the frontend
    return Response.json({ success: true, data: offeringsWithUsers });

  } catch (error) {
    console.error('Error fetching all offerings:', error);
    return Response.json({ success: false, error: 'Failed to fetch offerings' }, { status: 500 });
  }
}