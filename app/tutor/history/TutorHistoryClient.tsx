"use client";
import React, { useState } from "react";
import RatingGFX from "@/components/star-rating";
import { createReview } from "@/app/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Calendar,
  Clock,
  Users,
  Star,
  BookOpen,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

type HistoryItem = {
  id: string;
  appointmentId: string;
  Tutee: string;
  Date: string;
  Duration: string;
  Mode: string;
  Subject: string;
  Status: "Completed" | "Pending";
  TutorRated: boolean;
  TuteeRating?: number;
};

type TutorHistoryClientProps = {
  initialHistoryData: HistoryItem[];
  initialStatistics: {
    total: number;
    completed: number;
    pending: number;
    averageRating: number;
  };
};

const TutorHistoryClient: React.FC<TutorHistoryClientProps> = ({
  initialHistoryData,
  initialStatistics,
}) => {
  const [historyData, setHistoryData] = useState(initialHistoryData);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(
    null
  );
  const [tempRating, setTempRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = historyData.filter((item) =>
    item.Tutee.toLowerCase().includes(search.toLowerCase())
  );

  const openRatingModal = (session: HistoryItem) => {
    setSelectedSession(session);
    setTempRating(0);
    setModalOpen(true);
  };

  const submitRating = async () => {
    if (!selectedSession || tempRating === 0) return;

    setIsSubmitting(true);
    try {
      const result = await createReview({
        appointmentId: selectedSession.appointmentId,
        rating: tempRating,
      });

      if (result.success) {
        // Update local state
        const updatedHistory = historyData.map((item) =>
          item.id === selectedSession.id
            ? { ...item, TutorRated: true, TuteeRating: tempRating }
            : item
        );
        setHistoryData(updatedHistory);

        // Recalculate statistics
        const ratedSessions = updatedHistory.filter(
          (h) => h.TutorRated && h.TuteeRating
        );
        const newAverageRating =
          ratedSessions.length > 0
            ? ratedSessions.reduce((sum, h) => sum + (h.TuteeRating || 0), 0) /
              ratedSessions.length
            : 0;

        setStatistics((prev) => ({
          ...prev,
          averageRating: Math.round(newAverageRating * 100) / 100,
        }));

        setModalOpen(false);
      } else {
        console.error("Failed to submit rating:", result.error);
        alert("Failed to submit rating. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      {/* <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          Tutoring History
        </h1>
        <p className="text-muted-foreground text-lg">
          Review your completed sessions and ratings
        </p>
      </div> */}

      <div className="flex flex-col-reverse lg:flex-col">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-bold mb-2">{statistics.total}</h3>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-3xl font-bold mb-2">
                {statistics.completed}
              </h3>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-3xl font-bold mb-2">{statistics.pending}</h3>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-3xl font-bold mb-2">
                {statistics.averageRating || "N/A"}
              </h3>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Session History
                </CardTitle>
                <CardDescription>
                  Review your past tutoring sessions and leave ratings
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name"
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Student</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-center">Mode</TableHead>
                    <TableHead className="text-center">Subject</TableHead>
                    <TableHead className="text-center">Status / Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
                          <h3 className="font-medium">
                            {search
                              ? "No sessions found"
                              : "No tutoring sessions yet"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {search
                              ? "Try adjusting your search terms"
                              : "Your completed sessions will appear here"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => (
                      <TableRow key={item.id} className="text-center">
                        <TableCell className="font-medium">
                          {item.Tutee}
                        </TableCell>
                        <TableCell>{item.Date}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.Duration}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.Mode}
                          </div>
                        </TableCell>
                        <TableCell>{item.Subject}</TableCell>
                        <TableCell>
                          {item.TutorRated && item.TuteeRating ? (
                            <div className="flex justify-center">
                              <RatingGFX rating={item.TuteeRating} />
                            </div>
                          ) : item.Status === "Completed" ? (
                            <Button
                              onClick={() => openRatingModal(item)}
                              disabled={isSubmitting}
                              size="sm"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Star className="w-4 h-4 mr-2" />
                              )}
                              Rate
                            </Button>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Dialog */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => !isSubmitting && setModalOpen(open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Star className="w-5 h-5" />
              Rate Your Session
            </DialogTitle>
            <DialogDescription className="text-center">
              How was your tutoring experience with {selectedSession?.Tutee}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => !isSubmitting && setTempRating(n)}
                  disabled={isSubmitting}
                  className={`text-4xl transition-colors hover:scale-110 transform ${
                    tempRating >= n
                      ? "text-yellow-500"
                      : "text-gray-300 hover:text-yellow-400"
                  } ${isSubmitting ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  ★
                </button>
              ))}
            </div>
            {tempRating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {tempRating} star{tempRating > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRating}
              disabled={tempRating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorHistoryClient;
