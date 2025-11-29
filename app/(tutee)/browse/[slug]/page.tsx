"use client";
import { useParams, useRouter } from "next/navigation";
import React, { use, useState, useEffect } from "react";
import { ArrowLeft, Clock, Star, MessageCircle, Users, Calendar, MapPin } from "lucide-react";
import Stepper, { Step } from "@/components/reactbits/stepper";
import { PiPauseCircle, PiWarningBold } from "react-icons/pi";
import Link from "next/link";
import { getOfferingById, getReviewsByOfferingId, createInquiry } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-64 lg:h-96 w-full rounded-lg" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardHeader>
              </Card>
            </div>
            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-4 w-3/4 mx-auto" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-700">
              {error || "Offer not found"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              We couldn't find the tutoring offer you're looking for.
            </p>
            <Button
              onClick={() => router.push("/browse")}
              className="w-full bg-green-700 hover:bg-green-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Other Offers
            </Button>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-green-50">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="flex items-center gap-2 text-green-700 hover:text-green-800 hover:bg-green-100 mb-6 text-base font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Browse
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left/Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative overflow-hidden rounded-xl shadow-lg">
              <img
                src={offer.banner}
                alt={offer.subject}
                className="w-full h-56 sm:h-64 md:h-80 lg:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
            </div>

            {/* Main Info Card */}
            <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                      {offer.subject}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Badge 
                        variant={offer.status === 'available' ? 'default' : 'secondary'}
                        className={`${
                          offer.status === 'available' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          offer.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        {offer.status}
                      </Badge>
                      {reviews.length > 0 && (
                        <>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{averageRating.toFixed(1)}</span>
                            <span className="text-gray-500">({reviews.length} reviews)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="prose prose-sm max-w-none mb-6">
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: offer.description }}
                  />
                </div>
                
                {/* Tutor Info */}
                {offer.user && (
                  <Card className="border border-green-100 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                            <AvatarImage
                              src={offer.user.imageUrl || "https://i.pravatar.cc/100?img=1"}
                              alt={offer.user.displayName}
                            />
                            <AvatarFallback className="bg-green-200 text-green-800 font-semibold">
                              {offer.user.displayName?.charAt(0) || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">
                              {offer.user.displayName}
                            </h3>
                            <Badge variant="outline" className="text-xs bg-white border-green-200 text-green-700">
                              <Users className="w-3 h-3 mr-1" />
                              Tutor
                            </Badge>
                          </div>
                        </div>
                        {offer.averageRating && offer.averageRating > 0 && (
                          <Badge className="bg-white text-gray-700 hover:bg-white border shadow-sm">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                            <span className="font-semibold">{offer.averageRating.toFixed(1)}</span>
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              </CardContent>
            </Card>

            {/* Availability Section */}
            <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Availability Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {offer.availability.map((slot) => (
                    <Card
                      key={slot.id}
                      className="border border-green-200 bg-linear-to-r from-green-50 to-emerald-50 hover:shadow-sm transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">{slot.day}</span>
                          </div>
                          <Badge className="bg-green-700 hover:bg-green-700 text-white font-medium">
                            {slot.start} - {slot.end}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Student Reviews
                    <Badge variant="secondary" className="ml-2 bg-gray-100">
                      {reviews.length}
                    </Badge>
                  </CardTitle>
                  {reviews.length > 0 && (
                    <Badge className="bg-yellow-50 text-yellow-800 hover:bg-yellow-50 border-yellow-200">
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= Math.round(averageRating)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-sm ml-1">
                          {averageRating.toFixed(1)}
                        </span>
                      </div>
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-600">
                      Be the first to review this tutor after your session!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ScrollArea className="max-h-96">
                      <div className="space-y-4 pr-4">
                        {visibleReviews.map((review) => (
                          <Card
                            key={review._id}
                            className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                                  <AvatarImage
                                    src={review.reviewer.imageUrl || "https://i.pravatar.cc/100?img=1"}
                                    alt={review.reviewer.displayName}
                                  />
                                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                    {review.reviewer.displayName?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">
                                        {review.reviewer.displayName}
                                      </h4>
                                      <div className="flex items-center gap-1 mt-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-4 h-4 ${
                                              star <= review.rating
                                                ? "text-yellow-500 fill-yellow-500"
                                                : "text-gray-300"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs bg-gray-50">
                                      {formatTimestamp(review.createdAt)}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-700 leading-relaxed">
                                    {review.comment}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Show More/Less buttons */}
                    {reviews.length > 5 && (
                      <div className="flex justify-center gap-3 pt-4 border-t">
                        {visibleCount < reviews.length && (
                          <Button
                            onClick={handleShowMore}
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            Show More Reviews ({reviews.length - visibleCount} more)
                          </Button>
                        )}
                        {visibleCount > 5 && (
                          <Button
                            onClick={handleShowLess}
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-800"
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
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="lg:sticky lg:top-20 shadow-lg border-0 bg-white z-3">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Ready to start learning?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get personalized help with <span className="font-medium text-green-700">{offer.subject}</span>
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleChatNow}
                    className="w-full bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-lg h-12 shadow-lg hover:shadow-xl transition-all"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {buttonLabel}
                  </Button>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      offer.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      offer.status === 'available' ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {offer.status === 'available' ? 'Available Now' : 'Currently Busy'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-sm border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-700">
                      {offer.availability.length}
                    </div>
                    <div className="text-xs text-gray-600">Time Slots</div>
                  </div>
                  
                  {reviews.length > 0 && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <Star className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-yellow-700">
                        {averageRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600">Rating</div>
                    </div>
                  )}
                  
                  {reviews.length > 0 && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg col-span-full">
                      <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-700">
                        {reviews.length}
                      </div>
                      <div className="text-xs text-gray-600">Student Reviews</div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subject</span>
                    <Badge variant="outline" className="bg-gray-50">
                      {offer.subject}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <Badge 
                      variant={offer.status === 'available' ? 'default' : 'secondary'}
                      className={offer.status === 'available' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {offer.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Response Time</span>
                    <Badge variant="outline" className="bg-gray-50">
                      Usually fast
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}