"use client";
import { 
  ArrowLeft, 
  ArrowRight, 
  Star, 
  Search, 
  Filter, 
  SlidersHorizontal,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  Sparkles,
  X,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { getAllOfferings } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

interface FilterState {
  search: string;
  minRating: number;
  selectedDays: string[];
  subjects: string[];
  status: string;
  sortBy: string;
}

export default function Browse() {
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [offerings, setOfferings] = useState<CardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    minRating: 0,
    selectedDays: [],
    subjects: [],
    status: "all",
    sortBy: "rating"
  });

  // Fetch offerings from MongoDB on component mount
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setLoading(true);
        const response = await getAllOfferings();

        if (response.success && response.data) {
          const userDept = (user?.publicMetadata as any)?.collegeInformation
            ?.department as string | undefined;

          // Filter subjects by department or show all if no specific department
          const filteredSubjects = response.data.filter(
            (s: any) => !userDept || s.department === userDept || s.department === "General"
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

  // Get unique subjects and days for filter options
  const availableSubjects = useMemo(() => {
    const subjects = new Set(offerings.map(o => o.subject));
    return Array.from(subjects).sort();
  }, [offerings]);

  const availableDays = useMemo(() => {
    const days = new Set(offerings.flatMap(o => o.availability.map(a => a.day)));
    return Array.from(days);
  }, [offerings]);

  // Filter and sort offerings based on current filters
  const filteredOfferings = useMemo(() => {
    let filtered = [...offerings];

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.subject.toLowerCase().includes(searchLower) ||
        offer.description.toLowerCase().includes(searchLower) ||
        offer.user?.displayName.toLowerCase().includes(searchLower)
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(offer => 
        (offer.averageRating || 0) >= filters.minRating
      );
    }

    // Subject filter
    if (filters.subjects.length > 0) {
      filtered = filtered.filter(offer => 
        filters.subjects.includes(offer.subject)
      );
    }

    // Day availability filter
    if (filters.selectedDays.length > 0) {
      filtered = filtered.filter(offer =>
        offer.availability.some(slot =>
          filters.selectedDays.includes(slot.day)
        )
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(offer => offer.status === filters.status);
    }

    // Sort
    switch (filters.sortBy) {
      case "rating":
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case "newest":
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case "subject":
        filtered.sort((a, b) => a.subject.localeCompare(b.subject));
        break;
      default:
        break;
    }

    return filtered;
  }, [offerings, filters]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: "",
      minRating: 0,
      selectedDays: [],
      subjects: [],
      status: "all",
      sortBy: "rating"
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-lg font-medium text-gray-700">Loading tutoring offers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center space-y-4">
            <div className="text-red-500 text-5xl">⚠️</div>
            <CardTitle className="text-xl text-red-600">{error}</CardTitle>
            <CardDescription>Please try refreshing the page</CardDescription>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get categorized offerings for tabs
  const getCategorizedOfferings = () => {
    const topRated = [...offerings]
      .filter(o => (o.averageRating || 0) >= 4.0)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 12);

    const newest = [...offerings]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 12);

    const trending = [...offerings]
      .filter(o => (o.totalReviews || 0) > 0)
      .sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0))
      .slice(0, 12);

    return { topRated, newest, trending };
  };

  const { topRated, newest, trending } = getCategorizedOfferings();

  // Get current offerings based on active tab and filters
  const getCurrentOfferings = () => {
    switch (activeTab) {
      case "top-rated":
        return topRated.filter(o => filteredOfferings.includes(o));
      case "newest":
        return newest.filter(o => filteredOfferings.includes(o));
      case "trending":
        return trending.filter(o => filteredOfferings.includes(o));
      default:
        return filteredOfferings;
    }
  };

  const currentOfferings = getCurrentOfferings();

  return (
    <div className="min-h-screen">
      {/* Header with Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col space-y-6">
            {/* Title and Stats */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Discover Amazing Tutors
                </h1>
                <p className="text-gray-600">
                  Found {currentOfferings.length} tutor{currentOfferings.length !== 1 ? 's' : ''} matching your criteria
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{offerings.length} total tutors</span>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by subject, tutor name, or description..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 py-6 text-base"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-3">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="subject">Subject</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                      {(filters.minRating > 0 || filters.selectedDays.length > 0 || filters.subjects.length > 0) && (
                        <Badge variant="secondary" className="ml-1">
                          {[
                            filters.minRating > 0 ? 1 : 0,
                            filters.selectedDays.length > 0 ? 1 : 0,
                            filters.subjects.length > 0 ? 1 : 0
                          ].reduce((a, b) => a + b, 0)}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filter Tutors</SheetTitle>
                      <SheetDescription>
                        Refine your search to find the perfect tutor
                      </SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6 px-4">
                      {/* Minimum Rating */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Minimum Rating</Label>
                        <div className="space-y-2">
                          <Slider
                            value={[filters.minRating]}
                            onValueChange={([value]) => setFilters(prev => ({ ...prev, minRating: value }))}
                            max={5}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Any</span>
                            <span>{filters.minRating > 0 ? `${filters.minRating}+ stars` : 'Any'}</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Subject Filter */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Subjects</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableSubjects.map(subject => (
                            <div key={subject} className="flex items-center space-x-2">
                              <Checkbox
                                id={`subject-${subject}`}
                                checked={filters.subjects.includes(subject)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFilters(prev => ({
                                      ...prev,
                                      subjects: [...prev.subjects, subject]
                                    }));
                                  } else {
                                    setFilters(prev => ({
                                      ...prev,
                                      subjects: prev.subjects.filter(s => s !== subject)
                                    }));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`subject-${subject}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {subject}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Availability Filter */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Available Days</Label>
                        <div className="space-y-2">
                          {availableDays.map(day => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day}`}
                                checked={filters.selectedDays.includes(day)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedDays: [...prev.selectedDays, day]
                                    }));
                                  } else {
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedDays: prev.selectedDays.filter(d => d !== day)
                                    }));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`day-${day}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Reset Filters */}
                      <Button variant="outline" onClick={resetFilters} className="w-full">
                        Reset All Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.search || filters.minRating > 0 || filters.selectedDays.length > 0 || filters.subjects.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{filters.search}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 hover:cursor-pointer"
                      onClick={() => setFilters(prev => ({ ...prev, search: "" }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {filters.minRating > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Rating: {filters.minRating}+ stars
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 hover:cursor-pointer"
                      onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {filters.subjects.map(subject => (
                  <Badge key={subject} variant="secondary" className="gap-1">
                    {subject}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 hover:cursor-pointer"
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        subjects: prev.subjects.filter(s => s !== subject)
                      }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                {filters.selectedDays.map(day => (
                  <Badge key={day} variant="secondary" className="gap-1">
                    {day}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 hover:cursor-pointer"
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        selectedDays: prev.selectedDays.filter(d => d !== day)
                      }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" className="gap-2">
              <BookOpen className="w-4 h-4" />
              All Tutors
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="gap-2">
              <Star className="w-4 h-4" />
              Top Rated
            </TabsTrigger>
            <TabsTrigger value="newest" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Newest
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-8 min-h-[500px] w-full">
            <TutorGrid offerings={currentOfferings} />
          </TabsContent>

          <TabsContent value="top-rated" className="mt-8 min-h-[500px] w-full">
            <TutorGrid offerings={currentOfferings} />
          </TabsContent>

          <TabsContent value="newest" className="mt-8 min-h-[500px] w-full">
            <TutorGrid offerings={currentOfferings} />
          </TabsContent>

          <TabsContent value="trending" className="mt-8 min-h-[500px] w-full">
            <TutorGrid offerings={currentOfferings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Reusable Tutor Grid Component
function TutorGrid({ offerings }: { offerings: CardInfo[] }) {
  if (offerings.length === 0) {
    return (
      <div className="min-h-[400px] w-screen xl:max-w-7xl lg:max-w-[996px] md:max-w-[736px] max-w-[393px] flex items-center justify-center">
        <div className="w-full flex justify-center">
          <Card className="p-12 text-center">
            <CardContent className="space-y-4">
              <div className="text-6xl">🔍</div>
              <CardTitle className="text-xl">No tutors found</CardTitle>
              <CardDescription>
                Try adjusting your filters or search terms to find more tutors.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        {offerings.map((offering) => (
        <Card key={offering._id} className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden">
          <div className="relative">
            <img
              src={offering.banner}
              alt={offering.subject}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
            
            {/* Status Badge */}
            <Badge 
              className={`absolute top-3 right-3 ${
                offering.status === "available" 
                  ? "bg-green-500 hover:bg-green-500" 
                  : "bg-red-500 hover:bg-red-500"
              }`}
            >
              {offering.status === "available" ? "Available" : "Unavailable"}
            </Badge>
            

          </div>

          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <CardTitle className="text-xl mb-2">{offering.subject}</CardTitle>
                {offering.user && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={offering.user.imageUrl} alt={offering.user.displayName} />
                      <AvatarFallback>
                        {offering.user.displayName?.charAt(0) || "T"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{offering.user.displayName}</p>
                        {offering.averageRating && !isNaN(Number(offering.averageRating)) && Number(offering.averageRating) > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {Number(offering.averageRating).toFixed(1)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        {offering.totalReviews || 0} reviews
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <CardDescription 
                className="line-clamp-2 prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{
                  __html: offering.description || "No description available"
                }}
              />

              {/* Availability Preview */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {offering.availability.length > 0 
                    ? `${offering.availability.length} time slot${offering.availability.length !== 1 ? 's' : ''} available`
                    : "No availability listed"
                  }
                </span>
              </div>

              {/* Action Button */}
              <Button asChild className="w-full">
                <Link href={`/browse/${offering._id}`}>
                  View Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}
