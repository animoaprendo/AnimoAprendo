"use client";

import React, { useState, useEffect } from "react";
import RatingGFX from "@/components/star-rating";

interface HistoryItem {
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

const placeholderHistory: HistoryItem[] = [
  {
    tutor: "Christian Peñano",
    date: "May 24, 2025",
    duration: "1 Hour",
    mode: "Online",
    subject: "S-ITCS111LA",
    status: "Completed",
    rated: true,
    ratings: {
      experience: 4,
      learning: 5,
      communication: 4,
      comment: "Very helpful session!",
    },
  },
  {
    tutor: "Yasmin Abad",
    date: "May 22, 2025",
    duration: "1 Hour",
    mode: "Online",
    subject: "S-ITCS227LA",
    status: "Completed",
  },
  {
    tutor: "Jeremiah Nueno",
    date: "May 18, 2025",
    duration: "2 Hours",
    mode: "Face-to-Face",
    subject: "S-ITCP322",
    status: "Pending",
  },
];

export default function History() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(
    null
  );
  const [ratings, setRatings] = useState({
    experience: 0,
    learning: 0,
    communication: 0,
    comment: "",
  });

  const filteredHistory = placeholderHistory.filter(
    (item) =>
      item.tutor.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<HistoryItem["status"], string> = {
    Completed: "bg-green-700",
    Pending: "bg-yellow-600",
    Cancelled: "bg-red-600",
  };

  // Statistics
  const completedSessions = placeholderHistory.filter(
    (item) => item.status === "Completed"
  );
  const totalCompleted = completedSessions.length;
  const averageRating =
    completedSessions.reduce((sum, item) => {
      if (!item.rated || !item.ratings) return sum;
      const avg =
        (item.ratings.experience +
          item.ratings.learning +
          item.ratings.communication) /
        3;
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

  const submitRating = () => {
    if (!selectedSession) return;
    selectedSession.rated = true;
    selectedSession.ratings = { ...ratings };
    setModalOpen(false);
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
            className={`cursor-pointer text-2xl ${
              i <= current ? "text-yellow-500" : "text-gray-300"
            }`}
            onClick={() => setRatings({ ...ratings, [category]: i })}
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
                {filteredHistory.map((item, i) => (
                  <tr key={i} className="hover:bg-neutral-100">
                    <td className="font-semibold">{item.tutor}</td>
                    <td>{item.date}</td>
                    <td>{item.duration}</td>
                    <td>{item.mode}</td>
                    <td>{item.subject}</td>
                    <td>
                      <div
                        className={`${statusColors[item.status]} text-white px-3 py-1 rounded-lg text-center font-semibold`}
                      >
                        {item.status}
                      </div>
                    </td>
                    <td className="text-center">
                      {item.status === "Completed" ? (
                        item.rated ? (
                          <div className="flex flex-col items-center">
                            <RatingGFX
                              rating={
                                ((item.ratings?.experience || 0) +
                                  (item.ratings?.learning || 0) +
                                  (item.ratings?.communication || 0)) /
                                3
                              }
                            />

                            {item.ratings?.comment && (
                              <p className="text-sm text-gray-600 mt-1"></p>
                            )}
                          </div>
                        ) : (
                          <button
                            className="bg-green-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-800 transition"
                            onClick={() => {
                              setSelectedSession(item);
                              setModalOpen(true);
                              setRatings({
                                experience: 0,
                                learning: 0,
                                communication: 0,
                                comment: "",
                              });
                            }}
                          >
                            Rate
                          </button>
                        )
                      ) : (
                        <button className="bg-yellow-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-yellow-700 transition">
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      No sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Statistics */}
        <div className="lg:w-1/4 flex flex-col gap-6">
          <div className="bg-green-100 p-6 rounded-2xl flex flex-col items-center transition-all duration-500">
            <span className="text-green-800 font-semibold">
              Completed Sessions
            </span>
            <span className="text-2xl font-bold">
              {Math.round(animatedCompleted)}
            </span>
          </div>
          <div className="bg-blue-100 p-6 rounded-2xl flex flex-col items-center transition-all duration-500">
            <span className="text-blue-800 font-semibold">Average Rating</span>
            <span className="text-2xl font-bold">
              {animatedRating.toFixed(1)}
            </span>
            <RatingGFX rating={averageRating} />
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 space-y-4">
            <h2 className="text-xl font-bold mb-2">
              Rate {selectedSession.tutor}
            </h2>

            <div className="space-y-4">
              <div>
                <span className="font-semibold">Overall Experience:</span>
                {renderStars(ratings.experience, "experience")}
              </div>
              <div>
                <span className="font-semibold">Learning Quality:</span>
                {renderStars(ratings.learning, "learning")}
              </div>
              <div>
                <span className="font-semibold">Communication:</span>
                {renderStars(ratings.communication, "communication")}
              </div>
              <div>
                <span className="font-semibold">Comment:</span>
                <textarea
                  className="w-full border border-neutral-300 rounded-xl p-2 mt-1"
                  rows={3}
                  value={ratings.comment}
                  onChange={(e) =>
                    setRatings({ ...ratings, comment: e.target.value })
                  }
                  placeholder="Write your feedback..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <button
                className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800"
                onClick={submitRating}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
