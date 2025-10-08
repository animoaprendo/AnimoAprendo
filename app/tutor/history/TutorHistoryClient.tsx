"use client";
import React, { useState } from "react";
import RatingGFX from "@/components/star-rating";
import { Dialog } from "@headlessui/react";
import { createReview } from "@/app/actions";

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
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);
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
        const ratedSessions = updatedHistory.filter(h => h.TutorRated && h.TuteeRating);
        const newAverageRating = ratedSessions.length > 0
          ? ratedSessions.reduce((sum, h) => sum + (h.TuteeRating || 0), 0) / ratedSessions.length
          : 0;

        setStatistics(prev => ({
          ...prev,
          averageRating: Math.round(newAverageRating * 100) / 100
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
    <div className="w-10/12 m-auto mt-4 flex flex-col gap-6">
      {/* Statistics */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-green-100 border border-green-300 rounded-xl p-4 flex flex-col items-center grow">
          <span className="text-2xl font-bold">{statistics.total}</span>
          <span className="text-neutral-600">Total Sessions</span>
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 flex flex-col items-center grow">
          <span className="text-2xl font-bold">{statistics.completed}</span>
          <span className="text-neutral-600">Completed</span>
        </div>
        <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 flex flex-col items-center grow">
          <span className="text-2xl font-bold">{statistics.pending}</span>
          <span className="text-neutral-600">Pending</span>
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded-xl p-4 flex flex-col items-center grow">
          <span className="text-2xl font-bold">{statistics.averageRating || "N/A"}</span>
          <span className="text-neutral-600">Average Rating</span>
        </div>
      </div>

      {/* Header & Search */}
      <div className="flex flex-row justify-between mt-4">
        <h1 className="text-2xl font-bold">Tutoring History</h1>
        <label className="input border border-neutral-300 rounded flex items-center px-2">
          <svg
            className="h-[1em] opacity-50 mr-2"
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
            required
            placeholder="Search by tutee"
            className="outline-none"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="text-center">
              <th>Tutee</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Mode</th>
              <th>Subject</th>
              <th>Status / Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-neutral-600">
                  {search ? "No sessions found matching your search." : "No tutoring sessions found."}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-neutral-200 text-center align-middle"
                >
                  <td>{item.Tutee}</td>
                  <td>{item.Date}</td>
                  <td>{item.Duration}</td>
                  <td>{item.Mode}</td>
                  <td>{item.Subject}</td>
                  <td>
                    {item.TutorRated && item.TuteeRating ? (
                      <div className="flex justify-center items-center gap-2">
                        <RatingGFX rating={item.TuteeRating}/>
                      </div>
                    ) : item.Status === "Completed" ? (
                      <button
                        className="bg-green-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => openRatingModal(item)}
                        disabled={isSubmitting}
                      >
                        Rate
                      </button>
                    ) : (
                      <span className="text-neutral-600">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => !isSubmitting && setModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <Dialog.Panel className="bg-white p-6 rounded-xl w-96 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-center">Rate Your Session</h2>
          <p className="text-center">
            How was your experience with {selectedSession?.Tutee}?
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => !isSubmitting && setTempRating(n)}
                className={`cursor-pointer text-3xl transition ${
                  tempRating >= n ? "text-yellow-500" : "text-gray-300"
                } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
              >
                ★
              </span>
            ))}
          </div>
          <button
            className="bg-green-900 text-white py-2 px-4 rounded-lg hover:bg-green-800 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={submitRating}
            disabled={tempRating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </button>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default TutorHistoryClient;