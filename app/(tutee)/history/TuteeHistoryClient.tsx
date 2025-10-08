"use client";

import React, { useState, useEffect } from "react";
import RatingGFX from "@/components/star-rating";
import { createReview } from "@/app/actions";

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
            <h1 className="text-3xl font-bold">📑 Session History</h1>
            <label className="input border border-neutral-300 rounded flex items-center gap-2 px-3 py-2">
              <svg
                className="h-5 w-5 opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </g>
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tutor or subject"
                className="outline-none flex-1"
              />
            </label>
          </div>

          <hr className="border-neutral-300" />

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-2xl shadow-lg">
            <table className="table w-full">
              <thead className="bg-green-700 text-white">
                <tr>
                  <th className="p-3">Tutor</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Mode</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-xl font-bold text-gray-700 mb-2">
                        {search ? "No sessions found" : "No tutoring sessions yet"}
                      </h3>
                      <p className="text-gray-500">
                        {search 
                          ? "Try adjusting your search terms." 
                          : "Your completed and upcoming sessions will appear here."
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 text-center">
                      <td className="font-medium">{item.tutor}</td>
                      <td>{item.date}</td>
                      <td>{item.duration}</td>
                      <td>
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {item.mode}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{item.subject}</td>
                      <td>
                        <span
                          className={`px-3 py-1 text-white text-xs rounded-full ${
                            statusColors[item.status]
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.status === "Completed" && !item.rated ? (
                          <button
                            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => openRatingModal(item)}
                            disabled={isSubmitting}
                          >
                            Rate Session
                          </button>
                        ) : item.status === "Completed" && item.rated && item.ratings ? (
                          <div className="flex justify-center">
                            <RatingGFX rating={item.ratings.experience} />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Statistics */}
        <div className="lg:w-1/4 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-center">📊 Statistics</h2>
            
            <div className="space-y-4">
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
                <div className="text-center pt-4 border-t">
                  <div className="text-2xl font-bold text-purple-600">
                    {animatedRating.toFixed(1)}⭐
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {modalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold mb-4 text-center">
              Rate Your Session
            </h3>
            <p className="text-center text-gray-600 mb-6">
              How was your experience with <strong>{selectedSession.tutor}</strong>?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Experience
                </label>
                {renderStars(ratings.experience, "experience")}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Learning Quality
                </label>
                {renderStars(ratings.learning, "learning")}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication
                </label>
                {renderStars(ratings.communication, "communication")}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (Optional)
                </label>
                <textarea
                  value={ratings.comment}
                  onChange={(e) => setRatings({ ...ratings, comment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={3}
                  placeholder="Share your thoughts about the session..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => !isSubmitting && setModalOpen(false)}
                className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                className="px-6 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={ratings.experience === 0 || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}