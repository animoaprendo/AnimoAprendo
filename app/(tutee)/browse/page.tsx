"use client";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import React, { useRef, useState, useEffect } from "react";
import { getAllOfferings } from "@/app/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";

interface CardInfo {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  availability: { id: string; day: string; start: string; end: string }[];
  banner: string;
  status: string;
  averageRating?: number;
  totalReviews?: number;
  createdAt?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    imageUrl?: string;
    displayName: string;
  };
}

interface TrendingTutor {
  id: string;
  name: string;
  subject: string;
  rating: number;
  image: string;
  totalReviews: number;
}

export default function Browse() {
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const newOffersScrollRef = useRef<HTMLDivElement>(null);
  const [offerings, setOfferings] = useState<CardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch offerings from MongoDB on component mount
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setLoading(true);
        const response = await getAllOfferings();

        if (response.success && response.data) {
          // Data is already sorted by the backend (rating desc, then createdAt asc for same ratings)
          const userDept = (user?.publicMetadata as any)?.collegeInformation
            ?.department as string | undefined;

          // Filter subjects by department
          const filteredSubjects = response.data.filter(
            (s: any) => s.department === userDept || s.department === "General"
          );

          setOfferings(filteredSubjects);
        } else {
          setError("Failed to load offerings");
        }
      } catch (err) {
        console.error("Error fetching offerings:", err);
        setError("Failed to load offerings");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferings();
  }, [user]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const scrollNewOffers = (dir: "left" | "right") => {
    if (newOffersScrollRef.current) {
      newOffersScrollRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <div className="loading loading-spinner loading-lg text-green-700"></div>
        <p className="mt-4 text-lg">Loading tutoring offers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-900">
        <p className="text-2xl font-bold text-red-600">{error}</p>
        <p className="text-gray-600 mt-2">Please try refreshing the page</p>
      </div>
    );
  }

  // Get trending tutors from real data (top 6 highest rated tutors)
  const getTrendingTutors = () => {
    const tutorsMap = new Map();

    // Group offerings by tutor and calculate their best ratings
    offerings.forEach((offering) => {
      if (
        offering.user &&
        offering.averageRating &&
        offering.averageRating > 0
      ) {
        const tutorId = offering.user.id;
        const currentTutor = tutorsMap.get(tutorId);

        if (!currentTutor || offering.averageRating > currentTutor.rating) {
          tutorsMap.set(tutorId, {
            id: tutorId,
            name: offering.user.displayName,
            subject: offering.subject,
            rating: offering.averageRating,
            image: offering.user.imageUrl || "https://i.pravatar.cc/150?img=1",
            totalReviews: offering.totalReviews || 0,
          });
        }
      }
    });

    // Convert to array and sort by rating, then return top 6
    return Array.from(tutorsMap.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  };

  const trendingTutors = getTrendingTutors();

  // Get newest offers (first 10 created offerings)
  const getNewestOffers = () => {
    // Create a copy of offerings before sorting to avoid mutating the original array
    // Sort by createdAt if available, otherwise use _id (ObjectId contains creation time)
    return [...offerings]
      .sort((a, b) => {
        // If both have createdAt, use that
        if (a.createdAt && b.createdAt) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        // If only one has createdAt, prioritize it
        if (a.createdAt && !b.createdAt) return -1;
        if (!a.createdAt && b.createdAt) return 1;

        // If neither has createdAt, use _id (ObjectId creation time)
        return b._id.localeCompare(a._id);
      })
      .slice(0, 10); // Show first 10 newest
  };

  const newestOffers = getNewestOffers();

  // Get top rated offers (first 10 from the already sorted array)
  const getTopRatedOffers = () => {
    const slice = offerings.slice(0, 10);
    return slice.filter(
      (offering) => offering.averageRating && offering.averageRating > 3
    );
  };

  const topRatedOffers = getTopRatedOffers();

  return (
    <div className="flex flex-col gap-12 py-6 w-10/12 h-full m-auto">
      {/* Top Rated */}
      {topRatedOffers.length > 0 && (
        <Card className="p-6">
          <CardHeader className="p-0 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-bold text-xl md:text-3xl text-green-900">
                  ⭐ Top Rated Offers
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Highest rated tutoring offers
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => scroll("left")}
                  variant="outline"
                  size="icon"
                  className="border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
                >
                  <ArrowLeft size={18} />
                </Button>
                <Button
                  onClick={() => scroll("right")}
                  variant="outline"
                  size="icon"
                  className="border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
                >
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <div
            ref={scrollRef}
            className="flex gap-6 p-2 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
          >
            {topRatedOffers.map((item, i) => (
              <Card
                key={i}
                className="min-w-[280px] max-w-[300px] hover:shadow-xl hover:scale-101 transition-all duration-200 flex flex-col"
              >
                <div className="relative">
                  <img
                    src={item.banner}
                    alt={item.subject}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-3 right-3 bg-green-700 hover:bg-green-700">
                    {item.status === "available" ? "Available" : "Unavailable"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800"
                  >
                    ⭐{" "}
                    {(item as any).averageRating > 0
                      ? (item as any).averageRating.toFixed(1)
                      : "New"}
                  </Badge>
                </div>
                <CardContent className="flex flex-col gap-2 p-4 h-full">
                  <h2 className="font-bold text-lg text-green-900">
                    {item.subject}
                  </h2>

                  {/* Tutor Information */}
                  {item.user && (
                    <div className="flex items-center gap-3 py-2 mb-2 border-b border-gray-100">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={
                            item.user.imageUrl ||
                            "https://i.pravatar.cc/100?img=1"
                          }
                          alt={item.user.displayName}
                        />
                        <AvatarFallback>
                          {item.user.displayName?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">
                          {item.user.displayName}
                        </span>
                        <span className="text-xs text-gray-500">Tutor</span>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-700 line-clamp-3 overflow-hidden">
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html:
                          item.description?.length > 50
                            ? item.description.substring(0, 50) + "..."
                            : item.description || "No description available",
                      }}
                    />
                  </div>
                  <Card className="text-xs text-green-700 mt-auto bg-green-50 border-green-200">
                    <CardContent className="p-2">
                      <p className="font-semibold mb-1">Availability:</p>
                      {item.availability.map((a) => (
                        <p key={a.id} className="text-xs">
                          {a.day} • {a.start} - {a.end}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                  <Button
                    asChild
                    className="mt-3 bg-green-700 hover:bg-green-800"
                  >
                    <Link href={`/browse/${item._id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* New Offers */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-bold text-xl md:text-3xl text-green-900">
                🆕 New Offers
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Latest offerings from our tutors
              </p>
            </div>
            <div className="flex gap-2">
              {newestOffers.length > 4 && (
                <>
                  <Button
                    onClick={() => scrollNewOffers("left")}
                    variant="outline"
                    size="icon"
                    className="border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <Button
                    onClick={() => scrollNewOffers("right")}
                    variant="outline"
                    size="icon"
                    className="border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
                  >
                    <ArrowRight size={18} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {newestOffers.length > 0 ? (
          <div
            ref={newOffersScrollRef}
            className="flex gap-6 p-2 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
          >
            {newestOffers.map((item: CardInfo) => (
              <Card
                key={item._id}
                className="min-w-[280px] max-w-[300px] hover:shadow-xl hover:scale-101 transition-all duration-200 flex flex-col"
              >
                <div className="relative">
                  <img
                    src={item.banner}
                    alt={item.subject}
                    className="w-full h-40 object-cover rounded-t-xl"
                  />
                  <Badge className="absolute top-3 right-3 bg-green-700 hover:bg-green-700">
                    {item.status === "available" ? "Available" : "Unavailable"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800"
                  >
                    ⭐{" "}
                    {item.averageRating && item.averageRating > 0
                      ? item.averageRating.toFixed(1)
                      : "New"}
                  </Badge>
                </div>
                <CardContent className="flex flex-col gap-2 p-4 h-full">
                  <h2 className="font-bold text-lg text-green-900">
                    {item.subject}
                  </h2>

                  {/* Tutor Information */}
                  {item.user && (
                    <div className="flex items-center gap-3 py-2 mb-2 border-b border-gray-100">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={
                            item.user.imageUrl ||
                            "https://i.pravatar.cc/100?img=1"
                          }
                          alt={item.user.displayName}
                        />
                        <AvatarFallback>
                          {item.user.displayName?.charAt(0) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">
                          {item.user.displayName}
                        </span>
                        <span className="text-xs text-gray-500">Tutor</span>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-700 line-clamp-2 overflow-hidden">
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html:
                          item.description?.length > 80
                            ? item.description.substring(0, 80) + "..."
                            : item.description || "No description available",
                      }}
                    />
                  </div>

                  <Card className="text-xs text-green-700 mt-auto bg-green-50 border-green-200">
                    <CardContent className="p-2">
                      <p className="font-semibold mb-1">Availability:</p>
                      {item.availability.slice(0, 2).map((a) => (
                        <p key={a.id} className="text-xs">
                          {a.day} • {a.start} - {a.end}
                        </p>
                      ))}
                      {item.availability.length > 2 && (
                        <p className="text-gray-500 text-xs">
                          +{item.availability.length - 2} more slots
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Button
                    asChild
                    className="mt-3 bg-green-700 hover:bg-green-800"
                  >
                    <Link href={`/browse/${item._id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent className="p-6">
              <p className="text-gray-600 text-lg mb-2">No new offers yet!</p>
              <p className="text-gray-500">
                New tutoring offers will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </Card>

      {/* Trending Tutors */}
      <Card className="p-10">
        <CardHeader className="p-0 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-bold text-xl md:text-3xl text-green-900">
                🌟 Trending Tutors
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Top-rated tutors from our community
              </p>
            </div>
          </div>
        </CardHeader>

        {trendingTutors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trendingTutors.map((tutor: TrendingTutor) => (
              <Card
                key={tutor.id}
                className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl hover:scale-101 transition-all duration-200"
              >
                <Avatar className="w-24 h-24 border-4 border-green-700">
                  <AvatarImage src={tutor.image} alt={tutor.name} />
                  <AvatarFallback className="text-2xl bg-green-100">
                    {tutor.name?.charAt(0) || "T"}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-bold text-lg text-green-900">
                  {tutor.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="text-sm text-green-800 bg-green-200"
                >
                  {tutor.subject}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-500 fill-yellow-500" size={18} />
                  <span className="font-semibold text-green-900">
                    {tutor.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({tutor.totalReviews} reviews)
                  </span>
                </div>
                <Button asChild className="bg-green-700 hover:bg-green-800">
                  <Link
                    href={`/browse/${offerings.find((o) => o.user?.id === tutor.id)?._id}`}
                  >
                    View Profile
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent className="p-6">
              <p className="text-gray-600 text-lg mb-2">
                No trending tutors yet!
              </p>
              <p className="text-gray-500">
                Tutors will appear here once they receive ratings.
              </p>
            </CardContent>
          </Card>
        )}
      </Card>
    </div>
  );
}
