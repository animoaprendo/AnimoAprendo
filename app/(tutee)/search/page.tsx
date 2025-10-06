"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { Search, Filter, X } from "lucide-react";
import SubjectCardTemplate from "@/components/subject-card";

interface CardInfo {
  Title: string;
  Image: string;
  Description: string;
  Rating: number;
  ExtraInfo: { Day: string; Time: string }[];
  TutorInfo: {
    UserId: string;
    Name: string;
    Image: string;
    Rank: number;
    Rating: number;
  };
  Reviews: {
    Image: string;
    Name: string;
    Username: string;
    Rating: number;
    Comment: string;
  }[];
}

export default function Browse() {
  const [search, setSearch] = useQueryState("query", { defaultValue: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    console.log("Search query:", search);
  }, [search]);

  // Placeholder results array
  const NewOffers: CardInfo[] = [
    {
      Title: "Web Development Basics",
      Image: "https://picsum.photos/300/200?random=1",
      Description: "Learn HTML, CSS, and JavaScript from scratch.",
      Rating: 4.5,
      ExtraInfo: [{ Day: "Monday", Time: "10:00 AM" }],
      TutorInfo: {
        UserId: "T1",
        Name: "John Doe",
        Image: "https://i.pravatar.cc/100?img=1",
        Rank: 1,
        Rating: 4.7,
      },
      Reviews: [
        {
          Image: "https://i.pravatar.cc/100?img=11",
          Name: "Alice",
          Username: "@alice",
          Rating: 5,
          Comment: "Great intro to web development!",
        },
      ],
    },
    {
      Title: "Data Structures & Algorithms",
      Image: "https://picsum.photos/300/200?random=2",
      Description: "Master problem-solving with DSA in Java.",
      Rating: 4.8,
      ExtraInfo: [{ Day: "Wednesday", Time: "2:00 PM" }],
      TutorInfo: {
        UserId: "T2",
        Name: "Jane Smith",
        Image: "https://i.pravatar.cc/100?img=2",
        Rank: 2,
        Rating: 4.9,
      },
      Reviews: [
        {
          Image: "https://i.pravatar.cc/100?img=12",
          Name: "Bob",
          Username: "@bob",
          Rating: 5,
          Comment: "Challenging but rewarding!",
        },
      ],
    },
    {
      Title: "Database Management Systems",
      Image: "https://picsum.photos/300/200?random=3",
      Description: "Learn MySQL, MongoDB, and database design.",
      Rating: 4.6,
      ExtraInfo: [{ Day: "Friday", Time: "4:00 PM" }],
      TutorInfo: {
        UserId: "T3",
        Name: "Michael Lee",
        Image: "https://i.pravatar.cc/100?img=3",
        Rank: 3,
        Rating: 4.6,
      },
      Reviews: [
        {
          Image: "https://i.pravatar.cc/100?img=13",
          Name: "Charlie",
          Username: "@charlie",
          Rating: 4,
          Comment: "Well structured lessons!",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-6 w-11/12 lg:w-10/12 mx-auto">
      {/* Controls Row: Search + Filters + Sort */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full">
        <form
          className="flex w-full lg:max-w-xl shadow-md rounded-xl overflow-hidden border border-gray-300"
          action={"/search"}
        >
          <input
            type="text"
            name="query"
            placeholder="Search by course code or subject name"
            className="px-4 py-3 text-lg font-medium text-gray-800 grow focus:outline-none"
            defaultValue={search}
          />
          <button className="bg-green-900 hover:bg-green-950 w-14 flex items-center justify-center">
            <Search className="text-white" />
          </button>
        </form>

        <div className="flex gap-3 items-center justify-end w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="btn btn-outline text-white bg-green-900 hover:bg-white hover:text-green-900 rounded-lg flex items-center gap-2"
          >
            <Filter size={16} /> Filters
          </button>

          <select className="select select-sm border-gray-300">
            <option>Sort by relevance</option>
            <option>Highest Rated</option>
            <option>Most Recent</option>
            <option>Tutor Rank</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl">
          Showing results for <strong>{search}</strong>{" "}
          <span className="text-gray-500 text-lg">
            ({NewOffers.length} found)
          </span>
        </h1>
      </div>

      <hr className="border-t border-gray-300" />

      {/* Results Grid */}
      {NewOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
          {NewOffers.map((item: CardInfo, i) => {
            return (
              <div
                key={i}
                className="bg-white rounded-2xl shadow hover:shadow-xl hover:scale-[1.02] transition-transform"
              >
                {SubjectCardTemplate(item, i)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <Image
            src="/images/no-results.png"
            alt="No results"
            width={180}
            height={180}
          />
          <h2 className="text-2xl font-bold text-gray-700">
            No results for <span className="text-green-900">"{search}"</span>
          </h2>
          <p className="text-gray-500">
            Try searching with a different course code, subject name, or check
            trending offers below.
          </p>
          <button className="btn btn-accent">Browse Trending Offers</button>
        </div>
      )}

      {/* Filters Drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-90 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setFiltersOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="ml-auto w-80 max-w-full h-full bg-white rounded-l-2xl shadow-2xl z-50 flex flex-col animate-slideIn">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-green-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
              {/* Day */}
              <div>
                <h3 className="font-semibold mb-2">Day</h3>
                <select className="select select-bordered w-full">
                  <option>Any Day</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-semibold mb-2">Minimum Rating</h3>
                <select className="select select-bordered w-full">
                  <option>Any</option>
                  <option>4 ★ & up</option>
                  <option>3 ★ & up</option>
                  <option>2 ★ & up</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex gap-3">
              <button
                className="btn flex-1 btn-outline text-white bg-red-900 hover:bg-white hover:text-red-900 rounded-lg
"
              >
                Reset
              </button>
              <button
                className="btn flex-1 btn-outline text-white bg-green-900 hover:bg-white hover:text-green-900 rounded-lg
"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
