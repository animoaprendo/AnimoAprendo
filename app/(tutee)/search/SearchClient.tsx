"use client";

import { getEffectiveSubjectSortingWeights, searchOfferings } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { Calendar, Clock, Filter, Loader2, Search, SearchX, Star, User } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import React, { useEffect, useMemo, useState } from "react";
import { calculateOfferingScore, DEFAULT_WEIGHTS, type SortingWeights } from "@/lib/subject-sorting";

interface Availability {
  id: string;
  day: string;
  start: string;
  end: string;
}

type TuteeAvailability = {
  day: string;
  timeRanges: {
    id?: string;
    timeStart: {
      hourOfDay: number;
      minute: number;
    };
    timeEnd: {
      hourOfDay: number;
      minute: number;
    };
  }[];
};

interface Offering {
  _id: string;
  userId?: string;
  subject: string;
  college?: string;
  department?: string;
  title?: string;
  description: string;
  banner: string;
  status: "available" | "paused";
  availability?: Availability[];
  averageRating?: number;
  createdAt?: string;
  // Booking statistics for weighted sorting
  totalBookingsCount?: number;
  repeatBookingsCount?: number;
  availabilityCount?: number;
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
  const { user } = useUser();
  const [search, setSearch] = useQueryState("query", { defaultValue: "" });
  const [sortBy, setSortBy] = useQueryState("sortBy", { defaultValue: "" });
  const [day, setDay] = useQueryState("day", { defaultValue: "" });
  const [rating, setRating] = useQueryState("rating", { defaultValue: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<Offering[]>(initialOfferings);
  const [isLoading, setIsLoading] = useState(false);
  const [sortingWeights, setSortingWeights] = useState<SortingWeights>(DEFAULT_WEIGHTS);
  const tuteeAvailability = useMemo(
    () => ((user?.publicMetadata as any)?.tuteeAvailability as TuteeAvailability[] | undefined) || [],
    [user]
  );

  useEffect(() => {
    const loadSortingWeights = async () => {
      try {
        const response = await getEffectiveSubjectSortingWeights();
        if (response.success && response.weights) {
          setSortingWeights(response.weights);
        } else {
          setSortingWeights(DEFAULT_WEIGHTS);
        }
      } catch (error) {
        console.error("Error loading sorting weights:", error);
        setSortingWeights(DEFAULT_WEIGHTS);
      }
    };

    loadSortingWeights();
  }, []);

  useEffect(() => {
    const fetchFilteredResults = async () => {
      setIsLoading(true);
      try {
        const response = await searchOfferings({
          query: search,
          sortBy,
          day,
          rating,
          tuteeAvailability,
        });

        if (response.success && response.data) {
          const userCollege = (user?.publicMetadata as any)?.collegeInformation
            ?.college as string | undefined;
          const userDept = (user?.publicMetadata as any)?.collegeInformation
            ?.department as string | undefined;

          // General subjects are only visible within the user's assigned college.
          const filteredSubjects = response.data.filter(
            (s: any) => {
              const isSameDepartment = Boolean(userDept) && s.department === userDept;
              const isGeneralInSameCollege =
                s.department === "General" &&
                Boolean(userCollege) &&
                s.college === userCollege;

              // Keep old behavior for users without mapped college/department data.
              if (!userDept && !userCollege) return true;

              return isSameDepartment || isGeneralInSameCollege;
            }
          );

          if(user) {
            setResults(filteredSubjects);
            
            // Log weighted sorting breakdown (temporary)
            // if (sortBy === 'weighted' || !sortBy) {
            //   console.log('\n=== SEARCH WEIGHTED SORTING BREAKDOWN ===');
            //   filteredSubjects.slice(0, 10).forEach((offering, index) => {
            //     const breakdown = getScoreBreakdown(offering, DEFAULT_WEIGHTS);
            //     console.log(`\n#${index + 1}: ${offering.subject}`);
            //     console.log(`Total Score: ${breakdown.totalScore.toFixed(2)}`);
            //     breakdown.breakdown.forEach(item => {
            //       console.log(`  ${item.metric}: ${item.value.toFixed(2)} → ${item.normalized.toFixed(2)} × ${item.weight}% = ${item.contribution.toFixed(2)}`);
            //     });
            //   });
            //   console.log('\n=========================================\n');
            // }
          } else {
            setResults(response.data);
            
            // Log weighted sorting breakdown (temporary)
            // if (sortBy === 'weighted' || !sortBy) {
            //   console.log('\n=== SEARCH WEIGHTED SORTING BREAKDOWN ===');
            //   response.data.slice(0, 10).forEach((offering: Offering, index: number) => {
            //     const breakdown = getScoreBreakdown(offering, DEFAULT_WEIGHTS);
            //     console.log(`\n#${index + 1}: ${offering.subject}`);
            //     console.log(`Total Score: ${breakdown.totalScore.toFixed(2)}`);
            //     breakdown.breakdown.forEach(item => {
            //       console.log(`  ${item.metric}: ${item.value.toFixed(2)} → ${item.normalized.toFixed(2)} × ${item.weight}% = ${item.contribution.toFixed(2)}`);
            //     });
            //   });
            //   console.log('\n=========================================\n');
            // }
          }
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
  }, [search, sortBy, day, rating, initialOfferings, tuteeAvailability, user]);

  const resultsWithMatch = useMemo(
    () =>
      results.map((item) => {
        const score = calculateOfferingScore(item, sortingWeights, { tuteeAvailability });
        return {
          ...item,
          matchPercent: Math.round(Math.max(0, Math.min(100, score))),
        };
      }),
    [results, tuteeAvailability, sortingWeights]
  );

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Tutor</h1>
        <p className="text-gray-600">Discover expert tutors for your academic needs</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
        <Card className="flex-1">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  name="query"
                  placeholder="Search by course code, subject name, or tutor..."
                  className="pl-10 rounded-r-none border-r-0 h-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  defaultValue={search}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-green-700 hover:bg-green-800 rounded-l-none px-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="border-green-200 text-green-700 hover:bg-green-50 flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(day || rating) && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {(day ? 1 : 0) + (rating ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader className="space-y-3">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <Filter className="h-5 w-5 text-green-700" />
                  Filter Results
                </SheetTitle>
                <SheetDescription>
                  Refine your search to find the perfect tutor for your needs
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-6 px-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Availability Day
                  </Label>
                  <Select value={day || "any"} onValueChange={(value) => setDay(value === "any" ? "" : value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a day" />
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

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Minimum Rating
                  </Label>
                  <Select value={rating || "any"} onValueChange={(value) => setRating(value === "any" ? "" : value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select minimum rating" />
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

              <div className="flex gap-3 pt-6 border-t px-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDay("");
                    setRating("");
                    setSortBy("");
                    setSearch("");
                  }}
                >
                  Clear All
                </Button>
                <Button
                  className="flex-1 bg-green-700 hover:bg-green-800"
                  onClick={() => setFiltersOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <Select value={sortBy || "weighted"} onValueChange={(value) => setSortBy(value === "weighted" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-[260px] h-11">
              <SelectValue placeholder="Smart sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weighted">Smart Sort (Recommended)</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="most-recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">
            {search ? (
              <>
                Results for <span className="text-green-700">"{search}"</span>
              </>
            ) : (
              "Available Tutoring Sessions"
            )}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {results.length} {results.length === 1 ? 'session' : 'sessions'} found
            </Badge>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {resultsWithMatch.map((item) => (
            <Card
              key={item._id}
              className="group overflow-hidden transition-all duration-300 border-0 shadow-md hover:shadow-xl hover:-translate-y-1"
            >
              <div className="relative overflow-hidden">
                <img
                  src={item.banner || `https://picsum.photos/400/240?random=${item._id}`}
                  alt={item.subject || item.title || "Subject"}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/400/240?random=${item._id}`;
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                <Badge 
                  className={`absolute top-3 right-3 shadow-sm ${
                    item.status === "available" 
                      ? "bg-green-600 hover:bg-green-600 border-green-500" 
                      : "bg-gray-600 hover:bg-gray-600 border-gray-500"
                  }`}
                >
                  {item.status === "available" ? "Available" : "Paused"}
                </Badge>
                <Badge className="absolute top-12 right-3 bg-white/95 text-gray-900 hover:bg-white shadow-sm border border-gray-200">
                  {item.matchPercent}% Match
                </Badge>
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-900">
                    {getDisplayRating(item)}
                  </span>
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-900 line-clamp-1">
                  {item.subject || item.title || "Untitled Subject"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {item.user?.id ? (
                    <Link href={`/profile/${item.user.id}`} className="flex items-center gap-2 rounded-md -m-1 p-1 hover:bg-gray-50 transition-colors">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.user?.imageUrl} />
                        <AvatarFallback className="text-xs bg-green-100 text-green-700">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <CardDescription className="text-sm font-medium hover:underline">
                        {item.user?.displayName || "Unknown Tutor"}
                      </CardDescription>
                    </Link>
                  ) : (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.user?.imageUrl} />
                        <AvatarFallback className="text-xs bg-green-100 text-green-700">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <CardDescription className="text-sm font-medium">
                        {item.user?.displayName || "Unknown Tutor"}
                      </CardDescription>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div
                  className="text-sm text-gray-600 line-clamp-2"
                  dangerouslySetInnerHTML={{ 
                    __html: item.description || "No description available" 
                  }}
                />
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Clock className="h-4 w-4" />
                    Availability
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {formatAvailability(item.availability)}
                  </p>
                </div>
                
                <Button asChild className="w-full bg-green-700 hover:bg-green-800 transition-colors">
                  <Link href={`/browse/${item._id}`}>
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="rounded-full bg-gray-100 p-6 mb-6">
              <SearchX className="h-12 w-12 text-gray-400" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900 mb-2">
              {search ? (
                <>
                  No results found for <span className="text-green-700">"{search}"</span>
                </>
              ) : (
                "No tutoring sessions available"
              )}
            </CardTitle>
            <CardDescription className="text-gray-500 max-w-md mb-6">
              {search 
                ? "We couldn't find any tutoring sessions matching your search. Try adjusting your search terms or filters."
                : "There are no tutoring sessions available at the moment. Check back later for new opportunities."
              }
            </CardDescription>
            {search && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearch("");
                    setDay("");
                    setRating("");
                    setSortBy("");
                  }}
                >
                  Clear Search
                </Button>
                <Button asChild className="bg-green-700 hover:bg-green-800">
                  <Link href="/browse">
                    Browse All Sessions
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}