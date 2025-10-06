"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { EyeIcon, PencilIcon, Play, Trash2Icon } from "lucide-react";
import {
  deleteSubject,
  pauseSubject,
  getOffers,
  resumeSubject,
} from "../actions";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { CreatePopup } from "../alert";

export default function TutorSubjects() {
  const { user } = useUser();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<
    "available" | "draft" | "paused"
  >("available");
  const [Data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [actionType, setActionType] = useState<
    "delete" | "pause" | "resume" | null
  >(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function fetchData() {
    setLoading(true);
    const result = await getOffers(userId);
    setData(result.data || []);
    setLoading(false);
  }

  function handleDelete(documentId: string) {
    deleteSubject({ userId, documentId });
    fetchData();
    setModalOpen(false);
    setActionType(null);
    CreatePopup("Deleted successfully", "success");
  }

  function handlePause(documentId: string) {
    pauseSubject({ userId, documentId });
    fetchData();
    setModalOpen(false);
    CreatePopup("Offer paused", "success");
  }

  function handleResume(documentId: string) {
    resumeSubject({ userId, documentId });
    fetchData();
    setModalOpen(false);
    setActionType(null);
    CreatePopup("Offer resumed", "success");
  }

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const subjects = Data.filter((s) => s.status === activeTab);

  // Skeleton Row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="p-2">
        <div className="h-14 w-24 bg-gray-300 rounded-md mx-auto"></div>
      </td>
      <td className="p-2">
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
      </td>
      <td className="p-2">
        <div className="h-4 w-40 bg-gray-300 rounded mx-auto"></div>
      </td>
      <td className="p-2">
        <div className="h-8 w-24 bg-gray-300 rounded mx-auto"></div>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-6 w-10/12 text-neutral-800">
      {/* Header */}
      <div className="flex flex-row gap-4 flex-wrap justify-between items-center">
        <h1 className="text-2xl font-bold text-nowrap">Subject Offerings</h1>
        <Link
          href={"/tutor/subjects/create"}
          className="md:ml-auto py-2 px-4 rounded-lg font-semibold bg-green-900 text-white hover:bg-green-800 text-nowrap"
        >
          + Create New Subject
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-row gap-2 border-b border-green-900 font-semibold justify-between md:justify-start">
        {["available", "paused", "draft"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-1 rounded-t-lg ${
              activeTab === tab
                ? "bg-green-900 text-white border border-b-0"
                : "hover:text-green-900 hover:cursor-pointer"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto rounded-lg shadow-md">
        <table className="table w-full">
          <thead className="bg-green-900 text-white">
            <tr className="text-center">
              <th>Preview</th>
              <th>Subject</th>
              <th>Schedule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : subjects.length > 0 ? (
              subjects.map((data, i) => (
                <tr
                  key={i}
                  className="text-center hover:bg-neutral-100 transition"
                >
                  <td className="p-2">
                    <Image
                      src={
                        data.banner && data.banner.trim() !== ""
                          ? data.banner
                          : "https://placehold.co/500x300.png?text=No+Image"
                      }
                      alt={data.subject}
                      width={80}
                      height={50}
                      className="h-14 w-24 object-cover rounded-md border mx-auto"
                      unoptimized
                    />
                  </td>
                  <td className="p-2 font-medium">{data.subject}</td>
                  <td className="p-2">
                    {data.availability.map((a: any) => (
                      <div key={a.id} className="text-sm">
                        {a.day} {a.start} - {a.end}
                      </div>
                    ))}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-row gap-2 justify-center *:px-3 *:py-1 *:rounded-md *:text-sm *:font-medium">
                      {activeTab === "paused" && (
                        <button
                          onClick={() => {
                            setSelectedSubject(data._id);
                            setActionType("resume");
                            setModalOpen(true);
                          }}
                          className="bg-green-700 text-white hover:bg-green-800 aspect-square flex items-center justify-center hover:cursor-pointer"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <Link
                        href={"/tutor/subjects/view/" + data._id}
                        className="bg-amber-200 hover:bg-amber-300 aspect-square flex items-center justify-center"
                      >
                        <EyeIcon size={16} />
                      </Link>
                      {activeTab !== "paused" && (
                        <Link
                          href={"/tutor/subjects/edit/" + data._id}
                          className="bg-blue-200 hover:bg-blue-300 aspect-square flex items-center justify-center"
                        >
                          <PencilIcon size={16} />
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSubject(data._id);
                          setActionType("delete");
                          setModalOpen(true);
                        }}
                        className="bg-red-700 text-white hover:bg-red-800 aspect-square flex items-center justify-center hover:cursor-pointer"
                      >
                        <Trash2Icon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center p-4 text-neutral-500">
                  No subjects in this tab yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Skeleton */}
      <div className="block lg:hidden space-y-4 min-h-[60svh]">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="card bg-white shadow-md rounded-lg overflow-hidden animate-pulse"
            >
              <div className="w-full aspect-video bg-gray-300"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 w-32 bg-gray-300 rounded"></div>
                <div className="h-4 w-24 bg-gray-300 rounded"></div>
                <div className="h-8 w-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))
        ) : subjects.length > 0 ? (
          subjects.map((data, i) => (
            <div
              key={i}
              className="card bg-white shadow-md rounded-lg overflow-hidden"
            >
              <Image
                src={
                  data.banner && data.banner.trim() !== ""
                    ? data.banner
                    : "https://placehold.co/500x300.png?text=No+Image"
                }
                alt={data.subject}
                width={500}
                height={300}
                className="w-full aspect-video object-cover"
                unoptimized
              />
              <div className="p-4 flex flex-col gap-3">
                <h2 className="font-bold text-lg">{data.subject}</h2>
                {data.availability.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {data.availability.map((sched: any) => (
                      <li
                        key={sched.id}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {sched.day} {sched.start}-{sched.end}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-2 [&>*:first-child]:col-span-2 [&>*:first-child]:py-3 gap-2">
                  {activeTab === "paused" && (
                    <button
                      onClick={() => {
                        setSelectedSubject(data._id);
                        setActionType("resume");
                        setModalOpen(true);
                      }}
                      className="bg-green-700 text-white hover:bg-green-800 px-3 py-1 rounded text-center"
                    >
                      Resume
                    </button>
                  )}
                  <Link
                    href={"/tutor/subjects/view/" + data._id}
                    className="bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded text-center"
                  >
                    View
                  </Link>
                  {activeTab !== "paused" && (
                    <Link
                      href={"/tutor/subjects/edit/" + data._id}
                      className="bg-blue-200 hover:bg-blue-300 px-3 py-1 rounded text-center"
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSubject(data._id);
                      setActionType("delete");
                      setModalOpen(true);
                    }}
                    className="bg-red-700 text-white hover:bg-red-800 px-3 py-1 rounded hover:cursor-pointer text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-neutral-500">
            No subjects in this tab yet.
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modalOpen && selectedSubject && actionType && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 w-96 flex flex-col gap-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold">Confirm Action</h2>
              <p>
                {activeTab === "paused" && actionType === "resume"
                  ? "Do you want to resume this offer?"
                  : activeTab === "available" && actionType === "delete"
                    ? "Do you want to pause or delete this offer?"
                    : actionType === "pause"
                      ? "Do you want to pause this offer temporarily?"
                      : "Are you sure you want to delete this offer?"}
              </p>
              <div className="flex justify-end gap-3 mt-4">
                {activeTab === "available" && actionType === "delete" && (
                  <button
                    onClick={() => handlePause(selectedSubject!)}
                    className="px-4 py-2 bg-yellow-400 rounded hover:bg-yellow-500"
                  >
                    Pause
                  </button>
                )}
                {actionType === "resume" && (
                  <button
                    onClick={() => handleResume(selectedSubject!)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Resume
                  </button>
                )}
                {actionType === "delete" && (
                  <button
                    onClick={() => handleDelete(selectedSubject!)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
