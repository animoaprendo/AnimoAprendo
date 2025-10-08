"use client";
import { useParams, useRouter } from "next/navigation";
import React, { use, useState, useEffect } from "react";
import { ArrowLeft, Clock, Star } from "lucide-react";
import Stepper, { Step } from "@/components/reactbits/stepper";
import { PiPauseCircle, PiWarningBold } from "react-icons/pi";
import Link from "next/link";
import { getOfferingById, getReviewsByOfferingId, createInquiry } from "@/app/actions";
import { useUser } from "@clerk/nextjs";

interface Availability {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface CardInfo {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  availability: Availability[];
  banner: string;
  status: string;
  averageRating?: number;
  totalReviews?: number;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    imageUrl?: string;
    displayName: string;
  };
}

interface Review {
  _id: string;
  offeringId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    imageUrl?: string;
    displayName: string;
  };
}

export default function OfferDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { user } = useUser();

  // State management
  const [offer, setOffer] = useState<CardInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch offering details
        const offeringResponse = await getOfferingById(slug);
        if (offeringResponse.success && offeringResponse.data) {
          setOffer(offeringResponse.data);
          
          // Fetch reviews for this offering
          const reviewsResponse = await getReviewsByOfferingId(slug);
          if (reviewsResponse.success && reviewsResponse.data) {
            setReviews(reviewsResponse.data);
          }
        } else {
          setError("Offering not found");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load offering details");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <div className="loading loading-spinner loading-lg text-green-700"></div>
        <p className="mt-4 text-lg">Loading offering details...</p>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <p className="text-2xl font-bold">{error || "Offer not found"}</p>
        <button
          onClick={() => router.push("/browse")}
          className="mt-4 btn btn-outline border-green-900 text-green-900 hover:bg-green-900 hover:text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Paused offer state
  if (offer.status === "paused") {
    return (
      <Stepper
        initialStep={1}
        stepCircleContainerClassName="bg-white/95"
        disableStepIndicators={true}
        footerClassName="hidden"
      >
        <Step>
          <div className="flex flex-col items-center gap-8 mb-6">
            <PiPauseCircle className="text-red-700 size-12 -mb-4" />
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-center font-bold text-2xl">Offer Paused</h1>
              <p className="text-lg text-center">
                It looks like the tutor has paused this offer. Please check back
                later or explore other available offers.
              </p>
            </div>
            <Link
              href={"/browse"}
              className="bg-green-700 hover:bg-green-600 text-white/95 hover:scale-105 transition-all rounded-2xl shadow font-bold px-4 py-3"
              replace={true}
            >
              Go Back
            </Link>
          </div>
        </Step>
      </Stepper>
    );
  }

  const buttonLabel = offer.status === "available" ? "Chat Now" : "Inquire Now";
  const visibleReviews = reviews.slice(0, visibleCount);
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, reviews.length));
  };

  const handleShowLess = () => {
    setVisibleCount(5);
  };

  const handleChatNow = async () => {
    try {
      // Get the current user ID from Clerk authentication
      const tuteeId = user?.id || "test-user-id"; // Fallback for testing
      
      console.log('Creating inquiry with tuteeId:', tuteeId, 'tutorId:', offer.userId);
      
      // Normalize IDs (ensure 'user_' prefix for consistency with chat IDs)
      const normalizeId = (id: string) => (id?.startsWith('user_') ? id : `user_${id}`);
      const normalizedTuteeId = normalizeId(tuteeId);
      const normalizedTutorId = normalizeId(offer.userId);

      // Create inquiry before redirecting to chat
      const inquiryData = {
        tuteeId: normalizedTuteeId,
        tutorId: normalizedTutorId,
        offeringId: offer._id,
      } as any; // API will hydrate subject/banner/description from DB

      const result = await createInquiry(inquiryData);
      console.log('Inquiry creation result:', result);
      
      // Redirect to chat with the tutor, including offering ID as query parameter
  router.push(`/chat/${normalizedTutorId}?offeringId=${offer._id}`);
    } catch (error) {
      console.error('Error creating inquiry:', error);
      // Still redirect to chat even if inquiry creation fails
      router.push(`/chat/${offer.userId}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b text-green-900 w-full">
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-[86rem] mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-green-800 hover:text-green-900 hover:cursor-pointer col-span-full text-lg font-semibold"
        >
          <ArrowLeft size={24} /> Back
        </button>

        {/* Left/Main Content */}
        <div className="flex flex-col gap-4 md:col-span-2">
          <img
            src={offer.banner}
            alt={offer.subject}
            className="w-full h-96 object-cover rounded-2xl shadow-md"
          />
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold mb-2">{offer.subject}</h1>
            <div 
              className="text-gray-700 mb-4"
              dangerouslySetInnerHTML={{ __html: offer.description }}
            />
            
            {/* Tutor Info */}
            {offer.user && (
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={offer.user.imageUrl || "https://i.pravatar.cc/100?img=1"}
                    alt={offer.user.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{offer.user.displayName}</h3>
                    <p className="text-gray-600 text-sm">Tutor</p>
                  </div>
                </div>
                {offer.averageRating && offer.averageRating > 0 && (
                  <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{offer.averageRating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">({offer.totalReviews || reviews.length})</span>
                  </div>
                )}
              </div>
            )}

            {/* Availability */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Clock size={20} />
                Availability
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {offer.availability.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="font-medium">{slot.day}</span>
                    <span className="text-green-700 font-semibold">
                      {slot.start} - {slot.end}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star size={24} className="text-yellow-500" />
                Reviews ({reviews.length})
              </h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className={`${
                          star <= Math.round(averageRating)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No reviews yet. Be the first to review this tutor!
              </p>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((review) => (
                  <div
                    key={review._id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={review.reviewer.imageUrl || "https://i.pravatar.cc/100?img=1"}
                        alt={review.reviewer.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{review.reviewer.displayName}</h4>
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={16}
                                  className={`${
                                    star <= review.rating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500 ml-2">
                              {formatTimestamp(review.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show More/Less buttons */}
                {reviews.length > 5 && (
                  <div className="flex justify-center gap-4 mt-6">
                    {visibleCount < reviews.length && (
                      <button
                        onClick={handleShowMore}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Show More Reviews
                      </button>
                    )}
                    {visibleCount > 5 && (
                      <button
                        onClick={handleShowLess}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Action Card */}
          <div className="p-6 bg-white rounded-2xl shadow-lg sticky top-6">
            <div className="text-center mb-4">
              <p className="text-gray-600 mb-2">Ready to get help with {offer.subject}?</p>
              <button
                onClick={handleChatNow}
                className="w-full btn bg-green-700 hover:bg-green-600 text-white border-none rounded-xl text-lg font-semibold"
              >
                {buttonLabel}
              </button>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                offer.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="capitalize text-gray-600">{offer.status}</span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subject:</span>
                <span className="font-semibold">{offer.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold capitalize ${
                  offer.status === 'available' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {offer.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Slots:</span>
                <span className="font-semibold">{offer.availability.length}</span>
              </div>
              {reviews.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <span className="font-semibold">{averageRating.toFixed(1)}/5</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}