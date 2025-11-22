"use client";

import React, { useState, useEffect } from "react";
import RatingGFX from "@/components/star-rating";
import { createReview } from "@/app/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Search, BookOpen, Star } from "lucide-react";

interface HistoryItem {
  id: string;
  appointmentId: string;
  tutor: string;
  date: string;
  duration: string;
  mode: string;
  subject: string;
  status: "Completed" | "Pending" | "Cancelled";
  rated?: boolean;
  ratings?: {
    experience: number;
    learning: number;
    communication: number;
    comment?: string;
  };
}

interface TuteeHistoryClientProps {
  initialHistory: HistoryItem[];
  initialStatistics: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
}

export default function TuteeHistoryClient({ 
  initialHistory, 
  initialStatistics 
}: TuteeHistoryClientProps) {
  const [history, setHistory] = useState(initialHistory);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);
  const [ratings, setRatings] = useState({
    experience: 0,
    learning: 0,
    communication: 0,
    comment: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredHistory = history.filter(
    (item) =>
      item.tutor.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<HistoryItem["status"], string> = {
    Completed: "bg-green-700",
    Pending: "bg-yellow-600",
    Cancelled: "bg-red-600",
  };

  // Calculate statistics from current data
  const completedSessions = history.filter((item) => item.status === "Completed");
  const totalCompleted = completedSessions.length;
  const averageRating = completedSessions.reduce((sum, item) => {
    if (!item.rated || !item.ratings) return sum;
    const avg = (item.ratings.experience + item.ratings.learning + item.ratings.communication) / 3;
    return sum + avg;
  }, 0) / (completedSessions.filter((item) => item.rated).length || 1);

  const [animatedCompleted, setAnimatedCompleted] = useState(0);
  const [animatedRating, setAnimatedRating] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const incrementCompleted = totalCompleted / (duration / 16);
    const incrementRating = averageRating / (duration / 16);
    const anim = setInterval(() => {
      start += 1;
      setAnimatedCompleted((prev) =>
        prev + incrementCompleted <= totalCompleted
          ? prev + incrementCompleted
          : totalCompleted
      );
      setAnimatedRating((prev) =>
        prev + incrementRating <= averageRating
          ? prev + incrementRating
          : averageRating
      );
      if (start >= duration / 16) clearInterval(anim);
    }, 16);
    return () => clearInterval(anim);
  }, [totalCompleted, averageRating]);

  const openRatingModal = (session: HistoryItem) => {
    setSelectedSession(session);
    setRatings({
      experience: 0,
      learning: 0,
      communication: 0,
      comment: "",
    });
    setModalOpen(true);
  };

  const submitRating = async () => {
    if (!selectedSession || ratings.experience === 0) return;

    setIsSubmitting(true);
    try {
      // Calculate average rating for submission
      const averageRatingForSubmission = Math.round(
        (ratings.experience + ratings.learning + ratings.communication) / 3
      );

      const result = await createReview({
        appointmentId: selectedSession.appointmentId,
        rating: averageRatingForSubmission,
        comment: ratings.comment || undefined,
      });

      if (result.success) {
        // Update local state
        const updatedHistory = history.map((item) =>
          item.id === selectedSession.id
            ? { 
                ...item, 
                rated: true, 
                ratings: { ...ratings }
              }
            : item
        );
        setHistory(updatedHistory);
        setModalOpen(false);
      } else {
        console.error("Failed to submit rating:", result.error);
        alert(`Failed to submit rating: ${result.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (
    current: number,
    category: "experience" | "learning" | "communication"
  ) => {
    return (
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`cursor-pointer text-2xl transition-colors ${
              i <= current ? "text-yellow-500" : "text-gray-300"
            } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={() => !isSubmitting && setRatings({ ...ratings, [category]: i })}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-11/12 mx-auto py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Session History */}
        <div className="lg:w-3/4 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-green-900 flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Session History
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tutor or subject"
                className="pl-10 w-full sm:w-80"
              />
            </div>
          </div>

          <Separator />

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-700 hover:bg-green-700">
                    <TableHead className="text-white font-semibold">Tutor</TableHead>
                    <TableHead className="text-white font-semibold">Date</TableHead>
                    <TableHead className="text-white font-semibold">Duration</TableHead>
                    <TableHead className="text-white font-semibold">Mode</TableHead>
                    <TableHead className="text-white font-semibold">Subject</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <BookOpen className="h-16 w-16 text-gray-400" />
                          <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">
                              {search ? "No sessions found" : "No tutoring sessions yet"}
                            </h3>
                            <p className="text-gray-500">
                              {search 
                                ? "Try adjusting your search terms." 
                                : "Your completed and upcoming sessions will appear here."
                              }
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.tutor}</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {item.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.subject}</TableCell>
                        <TableCell>
                          <Badge 
                            className={`text-white ${
                              item.status === 'Completed' ? 'bg-green-700 hover:bg-green-700' :
                              item.status === 'Pending' ? 'bg-yellow-600 hover:bg-yellow-600' :
                              'bg-red-600 hover:bg-red-600'
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "Completed" && !item.rated ? (
                            <Button
                              onClick={() => openRatingModal(item)}
                              disabled={isSubmitting}
                              className="bg-green-700 hover:bg-green-800"
                              size="sm"
                            >
                              Rate Session
                            </Button>
                          ) : item.status === "Completed" && item.rated && item.ratings ? (
                            <div className="flex justify-center">
                              <RatingGFX rating={item.ratings.experience} />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right Column: Statistics */}
        <div className="lg:w-1/4 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-center text-green-900 flex items-center justify-center gap-2">
                📊 Statistics
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {statistics.total}
                </div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.floor(animatedCompleted)}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {statistics.pending}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              
              {statistics.cancelled > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {statistics.cancelled}
                  </div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
              )}
              
              {totalCompleted > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
                      {animatedRating.toFixed(1)}
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-green-900">
              Rate Your Session
            </DialogTitle>
            <p className="text-center text-gray-600 mt-2">
              How was your experience with <strong>{selectedSession?.tutor}</strong>?
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Experience
              </label>
              {renderStars(ratings.experience, "experience")}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Quality
              </label>
              {renderStars(ratings.learning, "learning")}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Communication
              </label>
              {renderStars(ratings.communication, "communication")}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <Textarea
                value={ratings.comment}
                onChange={(e) => setRatings({ ...ratings, comment: e.target.value })}
                rows={3}
                placeholder="Share your thoughts about the session..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => !isSubmitting && setModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRating}
              className="bg-green-700 hover:bg-green-800"
              disabled={ratings.experience === 0 || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}