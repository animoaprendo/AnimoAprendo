"use client";
import { useParams, useRouter } from "next/navigation";
import React, { use, useState, useEffect } from "react";
import { ArrowLeft, Clock, Star } from "lucide-react";
import Stepper, { Step } from "@/components/reactbits/stepper";
import { PiPauseCircle, PiWarningBold } from "react-icons/pi";
import Link from "next/link";
import { getOfferingById, getReviewsByOfferingId, createInquiry } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <p className="mt-4 text-lg">Loading offering details...</p>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <p className="text-2xl font-bold">{error || "Offer not found"}</p>
        <Button
          onClick={() => router.push("/browse")}
          variant="outline"
          className="mt-4 border-green-900 text-green-900 hover:bg-green-900 hover:text-white"
        >
          Go Back
        </Button>
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
    <div className="min-h-screen bg-gradient-to-b text-green-900 w-screen">
      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-10 max-w-7xl mx-auto">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="flex items-center gap-2 text-green-800 hover:text-green-900 col-span-full text-lg font-semibold justify-start p-0 h-auto mb-2"
        >
          <ArrowLeft size={24} /> Back
        </Button>

        {/* Left/Main Content */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <img
            src={offer.banner}
            alt={offer.subject}
            className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg shadow-md"
          />
          <Card>
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold mb-2">{offer.subject}</h1>
              <div 
                className="text-gray-700 mb-4 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: offer.description }}
              />
              
              {/* Tutor Info */}
              {offer.user && (
                <Card className="mb-4 bg-gray-50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={offer.user.imageUrl || "https://i.pravatar.cc/100?img=1"}
                          alt={offer.user.displayName}
                        />
                        <AvatarFallback>
                          {offer.user.displayName?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{offer.user.displayName}</h3>
                        <Badge variant="secondary" className="text-xs">Tutor</Badge>
                      </div>
                    </div>
                    {offer.averageRating && offer.averageRating > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-white">
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{offer.averageRating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">({offer.totalReviews || reviews.length})</span>
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Availability */}
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  Availability
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {offer.availability.map((slot) => (
                    <Card
                      key={slot.id}
                      className="bg-green-50 border-green-200"
                    >
                      <CardContent className="flex flex-row justify-between items-start sm:items-center p-3 gap-1 sm:gap-0">
                        <span className="font-medium text-sm md:text-base">{slot.day}</span>
                        <Badge className="bg-green-700 hover:bg-green-700 text-xs md:text-sm">
                          {slot.start} - {slot.end}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <Star size={20} className="md:size-6 text-yellow-500" />
                  Reviews ({reviews.length})
                </h2>
                {reviews.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={`${
                            star <= Math.round(averageRating)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">
                      {averageRating.toFixed(1)}
                    </span>
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No reviews yet. Be the first to review this tutor!
                </p>
              ) : (
                <div className="space-y-4">
                  {visibleReviews.map((review) => (
                    <Card
                      key={review._id}
                      className="border border-gray-200"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={review.reviewer.imageUrl || "https://i.pravatar.cc/100?img=1"}
                              alt={review.reviewer.displayName}
                            />
                            <AvatarFallback>
                              {review.reviewer.displayName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{review.reviewer.displayName}</h4>
                              <div className="flex items-center gap-2">
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
                                <Badge variant="outline" className="text-xs">
                                  {formatTimestamp(review.createdAt)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Show More/Less buttons */}
                  {reviews.length > 5 && (
                    <div className="flex justify-center gap-4 mt-6">
                      {visibleCount < reviews.length && (
                        <Button
                          onClick={handleShowMore}
                          variant="outline"
                          className="bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
                        >
                          Show More Reviews
                        </Button>
                      )}
                      {visibleCount > 5 && (
                        <Button
                          onClick={handleShowLess}
                          variant="outline"
                          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Show Less
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Action Card */}
          <Card className="lg:sticky lg:top-20">
            <CardContent className="p-4 md:p-6">
              <div className="text-center mb-4">
                <p className="text-gray-600 mb-2 text-sm md:text-base">Ready to get help with {offer.subject}?</p>
                <Button
                  onClick={handleChatNow}
                  className="w-full bg-green-700 hover:bg-green-600 text-white text-base md:text-lg font-semibold h-10 md:h-12"
                >
                  {buttonLabel}
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 capitalize">
                <div className={`w-2 h-2 rounded-full ${
                  offer.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <Badge 
                  variant={offer.status === 'available' ? 'default' : 'secondary'}
                  className={offer.status === 'available' ? 'bg-green-700 hover:bg-green-700' : ''}
                >
                  {offer.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg md:text-xl font-semibold">Quick Info</h3>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subject:</span>
                <Badge variant="secondary">{offer.subject}</Badge>
              </div>
              <div className="flex justify-between items-center capitalize">
                <span className="text-gray-600">Status:</span>
                <Badge 
                  variant={offer.status === 'available' ? 'default' : 'secondary'}
                  className={offer.status === 'available' ? 'bg-green-700 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-600'}
                >
                  {offer.status}
                </Badge>
              </div>
              {/* <div className="flex justify-between items-center">
                <span className="text-gray-600">Available Slots:</span>
                <Badge variant="outline">{offer.availability.length}</Badge>
              </div> */}
              {reviews.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating:</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    {averageRating.toFixed(1)}/5
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}