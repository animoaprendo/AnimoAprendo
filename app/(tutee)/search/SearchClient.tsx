"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Search, Filter, X, SearchX } from "lucide-react";
import { searchOfferings } from "@/app/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
    <div className="flex flex-col gap-6 py-6 w-11/12 lg:w-10/12 mx-auto max-w-[1600px]">
      <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full">
        <Card className="flex-1 lg:max-w-xl">
          <form onSubmit={handleSubmit} className="flex">
            <Input
              type="text"
              name="query"
              placeholder="Search by course code or subject name"
              className="rounded-r-none border-r-0 text-lg font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
              defaultValue={search}
            />
            <Button
              type="submit"
              className="bg-green-900 hover:bg-green-950 rounded-l-none px-4"
              disabled={isLoading}
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>
        </Card>

        <div className="flex gap-3 items-center justify-end w-full lg:w-auto">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="default"
                className="bg-green-900 hover:bg-green-950 text-white flex items-center gap-2"
              >
                <Filter size={16} /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle className="text-green-900">Filters</SheetTitle>
              </SheetHeader>
              <div className="py-6 flex flex-col gap-6 mx-3">
                <div>
                  <h3 className="font-semibold mb-2">Day</h3>
                  <Select value={day || "any"} onValueChange={(value) => setDay(value === "any" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Day</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Minimum Rating</h3>
                  <Select value={rating || "any"} onValueChange={(value) => setRating(value === "any" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Rating</SelectItem>
                      <SelectItem value="4.5">4.5 ⭐ & up</SelectItem>
                      <SelectItem value="4">4.0 ⭐ & up</SelectItem>
                      <SelectItem value="3.5">3.5 ⭐ & up</SelectItem>
                      <SelectItem value="3">3.0 ⭐ & up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 mt-6 mx-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setDay("");
                    setRating("");
                    setSortBy("");
                    setSearch("");
                  }}
                >
                  Reset
                </Button>
                <Button
                  className="flex-1 bg-green-900 hover:bg-green-950"
                  onClick={() => setFiltersOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Select value={sortBy || "relevance"} onValueChange={(value) => setSortBy(value === "relevance" ? "" : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by relevance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Sort by relevance</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="most-recent">Most Recent</SelectItem>
              <SelectItem value="tutor-rank">Tutor Experience</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-xl lg:text-2xl font-semibold text-green-900">
          {search ? (
            <>
              Showing results for <strong>"{search}"</strong>{" "}
            </>
          ) : (
            "All Available Subjects "
          )}
          <Badge variant="secondary" className="ml-2">
            {results.length} found
          </Badge>
          {isLoading && (
            <span className="ml-2 text-sm text-green-600">Searching...</span>
          )}
        </h1>
      </div>

      <Separator />

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 justify-items-center">
          {results.map((item) => (
            <Card
              key={item._id}
              className="min-w-[280px] max-w-[300px] hover:shadow-xl hover:scale-105 transition-all duration-200 flex flex-col"
            >
              <div className="relative">
                <img
                  src={item.banner || "https://picsum.photos/300/200?random=" + item._id}
                  alt={item.subject || item.title || "Subject"}
                  className="w-full h-40 object-cover rounded-t-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/300/200?random=${item._id}`;
                  }}
                />
                <Badge 
                  className={`absolute top-3 right-3 ${
                    item.status === "available" ? "bg-green-700 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-600"
                  }`}
                >
                  {item.status === "available" ? "Available" : "Paused"}
                </Badge>
                <Badge 
                  variant="secondary"
                  className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800"
                >
                  ⭐ {getDisplayRating(item)}
                </Badge>
              </div>
              <CardContent className="flex flex-col gap-2 p-4 h-full">
                <h2 className="font-bold text-lg text-green-900">
                  {item.subject || item.title || "Untitled Subject"}
                </h2>
                
                <Badge variant="outline" className="text-xs w-fit">
                  by {item.user?.displayName || "Unknown Tutor"}
                </Badge>
                
                <div
                  className="text-sm text-gray-700 line-clamp-3"
                  dangerouslySetInnerHTML={{ 
                    __html: item.description || "No description available" 
                  }}
                />
                
                <Card className="text-xs text-green-700 mt-auto bg-green-50 border-green-200">
                  <CardContent className="p-2">
                    <p className="font-semibold mb-1">Availability:</p>
                    <p className="break-words text-xs">
                      {formatAvailability(item.availability)}
                    </p>
                  </CardContent>
                </Card>
                
                <Button asChild className="mt-3 bg-green-700 hover:bg-green-800">
                  <Link href={`/browse/${item._id}`}>
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-20">
          <CardContent className="flex flex-col items-center justify-center text-center gap-6">
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
          </CardContent>
        </Card>
      )}

    </div>
  );
}