"use client";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import React, { useRef } from "react";

interface CardInfo {
  _id: { $oid: string };
  userId: string;
  subject: string;
  description: string;
  availability: { id: string; day: string; start: string; end: string }[];
  banner: string;
  status: string;
}

export default function Browse() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const NewOffers: CardInfo[] = [
    {
      _id: { $oid: "68e124f6ca2cd032c7132635" },
      userId: "user_32v6ZOB8bP3oHl5kBPSDgvxc7eG",
      subject: "Mathematics",
      description: "<p>Master algebra, geometry, and more with interactive lessons.</p>",
      availability: [{ id: "1", day: "Monday", start: "08:00", end: "09:00" }],
      banner: "https://9idxhts2vbwdh6hb.public.blob.vercel-storage.com/keikchoco2-O9gw3FUynxpw5S2mxxD61TTgm4E5ln.jpg",
      status: "available",
    },
    {
      _id: { $oid: "68e124f6ca2cd032c7132636" },
      userId: "user_32v6ZOB8bP3oHl5kBPSDgvxc7eG",
      subject: "English Literature",
      description: "<p>Improve your literary analysis and writing skills with expert guidance.</p>",
      availability: [{ id: "2", day: "Wednesday", start: "10:00", end: "11:00" }],
      banner: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f",
      status: "available",
    },
  ];

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
    <div className="flex flex-col gap-12 pt-6 w-10/12 h-full m-auto">
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
          {NewOffers.map((item, i) => (
            <div
              key={i}
              className="min-w-[280px] max-w-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-transform flex flex-col"
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
              </div>
              <div className="flex flex-col gap-2 p-4">
                <h2 className="font-bold text-lg text-green-900">{item.subject}</h2>
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
                <button className="btn mt-3 bg-green-700 text-white hover:bg-green-800 rounded-lg">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Tutors */}
      <section className="flex flex-col gap-6 w-full bg-white p-10 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="font-bold text-3xl text-green-900">🌟 Trending Tutors</h1>
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
                <span className="font-semibold text-green-900">{tutor.rating}</span>
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
