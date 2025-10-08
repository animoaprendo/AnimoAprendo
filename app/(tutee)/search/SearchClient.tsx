"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Search, Filter, X, SearchX } from "lucide-react";
import { searchOfferings } from "@/app/actions";

interface Availability {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface Offering {
  _id: string;
  userId?: string;
  subject: string;
  title?: string;
  description: string;
  banner: string;
  status: "available" | "paused";
  availability?: Availability[];
  averageRating?: number;
  createdAt?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    imageUrl?: string;
    displayName: string;
  };
}

interface SearchClientProps {
  initialOfferings: Offering[];
}

export default function SearchClient({ initialOfferings }: SearchClientProps) {
  const [search, setSearch] = useQueryState("query", { defaultValue: "" });
  const [sortBy, setSortBy] = useQueryState("sortBy", { defaultValue: "" });
  const [day, setDay] = useQueryState("day", { defaultValue: "" });
  const [rating, setRating] = useQueryState("rating", { defaultValue: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<Offering[]>(initialOfferings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFilteredResults = async () => {
      setIsLoading(true);
      try {
        const response = await searchOfferings({
          query: search,
          sortBy,
          day,
          rating,
        });

        if (response.success && response.data) {
          setResults(response.data);
        } else {
          console.error("Error fetching filtered results:", response.error);
          // Fallback to initial offerings if search fails
          setResults(initialOfferings);
        }
      } catch (error) {
        console.error("Error in search:", error);
        setResults(initialOfferings);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(fetchFilteredResults, 300);
    return () => clearTimeout(timeoutId);
  }, [search, sortBy, day, rating, initialOfferings]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newQuery = (formData.get("query") as string) || "";
    setSearch(newQuery);
  };

  const formatAvailability = (availability?: Availability[]) => {
    if (!availability || availability.length === 0) {
      return "No availability set";
    }
    
    return availability.map((a) => `${a.day} • ${a.start} - ${a.end}`).join(", ");
  };

  const getDisplayRating = (offering: Offering) => {
    return offering.averageRating ? offering.averageRating.toFixed(1) : "New";
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
            className="bg-green-900 hover:bg-green-950 w-14 flex items-center justify-center disabled:opacity-50"
            disabled={isLoading}
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
            <option value="tutor-rank">Tutor Experience</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl">
          {search ? (
            <>
              Showing results for <strong>"{search}"</strong>{" "}
            </>
          ) : (
            "All Available Subjects"
          )}
          <span className="text-gray-500 text-lg">
            ({results.length} found)
          </span>
          {isLoading && (
            <span className="ml-2 text-sm text-gray-400">Searching...</span>
          )}
        </h1>
      </div>

      <hr className="border-t border-gray-300" />

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 justify-items-center">
          {results.map((item) => (
            <div
              key={item._id}
              className="min-w-[280px] max-w-[300px] bg-white rounded-xl shadow-lg hover:shadow-xl hover:scale-101 transition-transform flex flex-col"
            >
              <div className="relative">
                <img
                  src={item.banner || "https://picsum.photos/300/200?random=" + item._id}
                  alt={item.subject || item.title || "Subject"}
                  className="w-full h-40 object-cover rounded-t-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/300/200?random=${item._id}`;
                  }}
                />
                <span className="absolute top-3 right-3 bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {item.status === "available" ? "Available" : "Paused"}
                </span>
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">
                  ⭐ {getDisplayRating(item)}
                </div>
              </div>
              <div className="flex flex-col gap-2 p-4 h-full">
                <h2 className="font-bold text-lg text-green-900">
                  {item.subject || item.title || "Untitled Subject"}
                </h2>
                
                <p className="text-sm text-gray-600 font-medium">
                  by {item.user?.displayName || "Unknown Tutor"}
                </p>
                
                <div
                  className="text-sm text-gray-700 line-clamp-3"
                  dangerouslySetInnerHTML={{ 
                    __html: item.description || "No description available" 
                  }}
                />
                
                <div className="text-xs text-green-700 mt-auto">
                  <p className="font-semibold">Availability:</p>
                  <p className="break-words">
                    {formatAvailability(item.availability)}
                  </p>
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <SearchX size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold text-gray-700">
            {search ? (
              <>
                No results for <span className="text-green-900">"{search}"</span>
              </>
            ) : (
              "No subjects available"
            )}
          </h2>
          <p className="text-gray-500">
            {search 
              ? "Try searching with a different course code or subject name."
              : "Check back later for new tutoring subjects."
            }
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
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Minimum Rating</h3>
                <select
                  className="select select-bordered w-full"
                  onChange={(e) => setRating(e.target.value)}
                  value={rating}
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5 ⭐ & up</option>
                  <option value="4">4.0 ⭐ & up</option>
                  <option value="3.5">3.5 ⭐ & up</option>
                  <option value="3">3.0 ⭐ & up</option>
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