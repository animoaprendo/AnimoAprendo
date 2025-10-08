"use client";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import React, { useRef, useState, useEffect } from "react";
import { getAllOfferings } from "@/app/actions";

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
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    imageUrl?: string;
    displayName: string;
  };
}

export default function Browse() {
  const scrollRef = useRef<HTMLDivElement>(null);
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
          setOfferings(response.data);
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
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
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

  const TrendingTutors = [
    {
      id: "TT1",
      name: "Sarah Kim",
      subject: "UI/UX Design",
      rating: 4.9,
      image: "https://i.pravatar.cc/150?img=4",
    },
    {
      id: "TT2",
      name: "David Park",
      subject: "Cybersecurity",
      rating: 4.8,
      image: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: "TT3",
      name: "Emma Wilson",
      subject: "Mobile App Development",
      rating: 4.7,
      image: "https://i.pravatar.cc/150?img=6",
    },
  ];

  return (
    <div className="flex flex-col gap-12 py-6 w-10/12 h-full m-auto">
      {/* New Offers */}
      <section className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center">
          <h1 className="font-bold text-3xl text-green-900">🆕 New Offers</h1>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="btn btn-outline border-green-700 text-green-700 hover:bg-green-700 hover:text-white rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="btn btn-outline border-green-700 text-green-700 hover:bg-green-700 hover:text-white rounded-lg"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 p-2 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth"
        >
          {offerings.map((item, i) => (
            <div
              key={i}
              className="min-w-[280px] max-w-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl hover:scale-101 transition-transform flex flex-col"
            >
              <div className="relative">
                <img
                  src={item.banner}
                  alt={item.subject}
                  className="w-full h-40 object-cover rounded-t-xl"
                />
                <span className="absolute top-3 right-3 bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {item.status === "available" ? "Available" : "Unavailable"}
                </span>
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">
                  ⭐ {(item as any).averageRating > 0 ? (item as any).averageRating.toFixed(1) : "New"}
                </div>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <h2 className="font-bold text-lg text-green-900">
                  {item.subject}
                </h2>
                
                {/* Tutor Information */}
                {item.user && (
                  <div className="flex items-center gap-3 py-2 mb-2 border-b border-gray-100">
                    <img
                      src={item.user.imageUrl || "https://i.pravatar.cc/100?img=1"}
                      alt={item.user.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800">
                        {item.user.displayName}
                      </span>
                      <span className="text-xs text-gray-500">Tutor</span>
                    </div>
                  </div>
                )}
                
                <div
                  className="text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                <div className="text-xs text-green-700 mt-2">
                  <p className="font-semibold">Availability:</p>
                  {item.availability.map((a) => (
                    <p key={a.id}>
                      {a.day} • {a.start} - {a.end}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/browse/${item._id}`}
                  className="btn mt-3 bg-green-700 text-white hover:bg-green-800 rounded-lg"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Tutors */}
      <section className="flex flex-col gap-6 w-full bg-white p-10 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="font-bold text-3xl text-green-900">
            🌟 Trending Tutors
          </h1>
          <button className="btn btn-outline border-green-700 text-green-700 hover:bg-green-700 hover:text-white rounded-lg">
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {TrendingTutors.map((tutor) => (
            <div
              key={tutor.id}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition-transform"
            >
              <img
                src={tutor.image}
                alt={tutor.name}
                className="w-24 h-24 rounded-full border-4 border-green-700"
              />
              <h2 className="font-bold text-lg text-green-900">{tutor.name}</h2>
              <p className="text-sm text-green-800">{tutor.subject}</p>
              <div className="flex items-center gap-1">
                <Star className="text-yellow-500 fill-yellow-500" size={18} />
                <span className="font-semibold text-green-900">
                  {tutor.rating}
                </span>
              </div>
              <button className="btn bg-green-700 text-white hover:bg-green-800 rounded-lg">
                View Profile
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
