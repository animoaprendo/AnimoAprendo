"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Search, Filter, X, SearchX } from "lucide-react";

interface Availability {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface CardInfo {
  _id: { $oid: string };
  userId?: string;
  subject: string;
  description: string;
  banner: string;
  status: "available" | "paused";
  availability: Availability[];
  rating: number;
  tutor: {
    name: string;
    rank: number;
  };
}

export default function SearchPage() {
  const [search, setSearch] = useQueryState("query", { defaultValue: "" });
  const [sortBy, setSortBy] = useQueryState("sortBy", { defaultValue: "" });
  const [day, setDay] = useQueryState("day", { defaultValue: "" });
  const [rating, setRating] = useQueryState("rating", { defaultValue: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<CardInfo[]>([]);

  const AllOffers: CardInfo[] = [
    {
      _id: {
        $oid: "68e124f6ca2cd032c7132635",
      },
      userId: "user_32v6ZOB8bP3oHl5kBPSDgvxc7eG",
      subject: "Mathematics",
      description: "<p>aaaa</p>",
      availability: [
        {
          id: "c12293cf-c932-4c9a-8450-295ccffe9aee",
          day: "Monday",
          start: "08:00",
          end: "09:00",
        },
      ],
      banner:
        "https://9idxhts2vbwdh6hb.public.blob.vercel-storage.com/keikchoco2-O9gw3FUynxpw5S2mxxD61TTgm4E5ln.jpg",
      status: "available",
      rating: 4.9,
      tutor: {
        name: "John Doe",
        rank: 1,
      },
    },
    {
      _id: { $oid: "2" },
      subject: "Data Structures & Algorithms",
      description: "Master problem-solving with DSA in Java.",
      banner: "https://picsum.photos/300/200?random=2",
      status: "available",
      availability: [
        { id: "a2", day: "Wednesday", start: "2:00 PM", end: "4:00 PM" },
      ],
      rating: 4.8,
      tutor: { name: "Jane Smith", rank: 2 },
    },
    {
      _id: { $oid: "3" },
      subject: "Database Management Systems",
      description: "Learn MySQL, MongoDB, and database design.",
      banner: "https://picsum.photos/300/200?random=3",
      status: "paused",
      availability: [
        { id: "a3", day: "Friday", start: "4:00 PM", end: "6:00 PM" },
      ],
      rating: 4.6,
      tutor: { name: "Michael Lee", rank: 3 },
    },
  ];

  useEffect(() => {
    let filtered = [...AllOffers];

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (offer) =>
          offer.subject.toLowerCase().includes(lowerSearch) ||
          offer.tutor.name.toLowerCase().includes(lowerSearch)
      );
    }

    if (day) {
      filtered = filtered.filter((offer) =>
        offer.availability.some(
          (a) => a.day.toLowerCase() === day.toLowerCase()
        )
      );
    }

    if (rating) {
      filtered = filtered.filter((offer) => offer.rating >= parseFloat(rating));
    }

    if (sortBy === "highest-rated") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "tutor-rank") {
      filtered.sort((a, b) => a.tutor.rank - b.tutor.rank);
    } else if (sortBy === "most-recent") {
      filtered.sort(() => Math.random() - 0.5); // placeholder
    }

    setResults(filtered);
  }, [search, sortBy, day, rating]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newQuery = (formData.get("query") as string) || "";
    setSearch(newQuery);
  };

  return (
    <div className="flex flex-col gap-6 pt-6 w-11/12 lg:w-10/12 mx-auto max-w-[1600px]">
      <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full">
        <form
          onSubmit={handleSubmit}
          className="flex w-full lg:max-w-xl shadow-md rounded-xl overflow-hidden border border-gray-300"
        >
          <input
            type="text"
            name="query"
            placeholder="Search by course code or subject name"
            className="px-4 py-3 text-lg font-medium text-gray-800 grow focus:outline-none"
            defaultValue={search}
          />
          <button
            type="submit"
            className="bg-green-900 hover:bg-green-950 w-14 flex items-center justify-center"
          >
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
          <select
            className="select select-sm border-gray-300"
            onChange={(e) => setSortBy(e.target.value)}
            value={sortBy}
          >
            <option value="">Sort by relevance</option>
            <option value="highest-rated">Highest Rated</option>
            <option value="most-recent">Most Recent</option>
            <option value="tutor-rank">Tutor Rank</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl">
          Showing results for <strong>{search}</strong>{" "}
          <span className="text-gray-500 text-lg">
            ({results.length} found)
          </span>
        </h1>
      </div>

      <hr className="border-t border-gray-300" />

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 justify-items-center">
          {results.map((item, i) => (
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
                  {item.status === "available" ? "Available" : "Paused"}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-4 h-full">
                <h2 className="font-bold text-lg text-green-900">
                  {item.subject}
                </h2>
                <div
                  className="text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                <div className="text-xs text-green-700 mt-auto">
                  <p className="font-semibold">Availability:</p>
                  {item.availability.map((a) => (
                    <p key={a.id}>
                      {a.day} • {a.start} - {a.end}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/browse/${item._id.$oid}`}
                  className="btn mt-3 bg-green-700 text-white hover:bg-green-800 rounded-lg"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <SearchX size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold text-gray-700">
            No results for <span className="text-green-900">"{search}"</span>
          </h2>
          <p className="text-gray-500">
            Try searching with a different course code or subject name.
          </p>
        </div>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-90 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="ml-auto w-80 max-w-full h-full bg-white rounded-l-2xl shadow-2xl z-50 flex flex-col animate-slideIn">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-green-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
              <div>
                <h3 className="font-semibold mb-2">Day</h3>
                <select
                  className="select select-bordered w-full"
                  onChange={(e) => setDay(e.target.value)}
                  value={day}
                >
                  <option value="">Any Day</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                </select>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Minimum Rating</h3>
                <select
                  className="select select-bordered w-full"
                  onChange={(e) => setRating(e.target.value)}
                  value={rating}
                >
                  <option value="">Any</option>
                  <option value="4">4 ★ & up</option>
                  <option value="3">3 ★ & up</option>
                  <option value="2">2 ★ & up</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                className="btn flex-1 btn-outline text-white bg-red-900 hover:bg-white hover:text-red-900 rounded-lg"
                onClick={() => {
                  setDay("");
                  setRating("");
                  setSortBy("");
                  setSearch("");
                }}
              >
                Reset
              </button>
              <button
                className="btn flex-1 btn-outline text-white bg-green-900 hover:bg-white hover:text-green-900 rounded-lg"
                onClick={() => setFiltersOpen(false)}
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
