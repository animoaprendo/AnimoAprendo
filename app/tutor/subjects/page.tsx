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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function TutorSubjects() {
  const { user } = useUser();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<
    "available" | "draft" | "paused" | "pending"
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
    console.log("Fetched subjects:", result.data);
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
    <TableRow>
      <TableCell className="text-center">
        <Skeleton className="h-14 w-24 mx-auto" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-4 w-40 mx-auto" />
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-8 w-24 mx-auto" />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="flex flex-col py-6 gap-6 w-10/12 text-neutral-800">
      {/* Header */}
      <div className="flex flex-row gap-4 flex-wrap justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Subject Offerings</h1>
        <Button asChild>
          <Link href="/tutor/subjects/create">
            + Create New Subject
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-row gap-2 border-b font-semibold justify-between md:justify-start">
        {["available", "paused", "draft", "pending"].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            onClick={() => setActiveTab(tab as any)}
            className="rounded-b-none"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Preview</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-center">Schedule</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : subjects.length > 0 ? (
              subjects.map((data, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">
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
                  </TableCell>
                  <TableCell className="font-medium">{data.subject}</TableCell>
                  <TableCell className="text-center">
                    {data.availability.map((a: any) => (
                      <div key={a.id} className="text-sm">
                        {a.day} {a.start} - {a.end}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <div className="flex flex-row gap-2 justify-center">
                        {activeTab === "paused" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedSubject(data._id);
                                  setActionType("resume");
                                  setModalOpen(true);
                                }}
                              >
                                <Play size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Resume</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" asChild>
                              <Link href={"/tutor/subjects/view/" + data._id}>
                                <EyeIcon size={16} />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View</p>
                          </TooltipContent>
                        </Tooltip>
                        {activeTab !== "paused" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={"/tutor/subjects/edit/" + data._id}>
                                  <PencilIcon size={16} />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedSubject(data._id);
                                setActionType("delete");
                                setModalOpen(true);
                              }}
                            >
                              <Trash2Icon size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No subjects in this tab yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="block lg:hidden space-y-4 min-h-[60svh]">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="w-full aspect-video" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))
        ) : subjects.length > 0 ? (
          subjects.map((data, i) => (
            <Card key={i} className="overflow-hidden">
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
              <CardContent className="p-4">
                <CardTitle className="mb-3">{data.subject}</CardTitle>
                {data.availability.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {data.availability.map((sched: any) => (
                      <span
                        key={sched.id}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {sched.day} {sched.start}-{sched.end}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {activeTab === "paused" && (
                    <Button
                      className="col-span-2"
                      onClick={() => {
                        setSelectedSubject(data._id);
                        setActionType("resume");
                        setModalOpen(true);
                      }}
                    >
                      Resume
                    </Button>
                  )}
                  <Button variant="secondary" asChild>
                    <Link href={"/tutor/subjects/view/" + data._id}>
                      View
                    </Link>
                  </Button>
                  {activeTab !== "paused" ? (
                    <Button variant="outline" asChild>
                      <Link href={"/tutor/subjects/edit/" + data._id}>
                        Edit
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedSubject(data._id);
                        setActionType("delete");
                        setModalOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  {activeTab !== "paused" && (
                    <Button
                      variant="destructive"
                      className="col-span-2"
                      onClick={() => {
                        setSelectedSubject(data._id);
                        setActionType("delete");
                        setModalOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No subjects in this tab yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Professional Confirmation Modal */}
      <AnimatePresence>
        {modalOpen && selectedSubject && actionType && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="mx-4 w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    {actionType === "delete" ? (
                      <Trash2Icon className="w-6 h-6 text-destructive" />
                    ) : actionType === "resume" ? (
                      <Play className="w-6 h-6 text-primary" />
                    ) : (
                      <PencilIcon className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-xl">
                    {actionType === "delete" ? "Delete Subject" :
                     actionType === "resume" ? "Resume Subject" :
                     "Pause Subject"}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {activeTab === "paused" && actionType === "resume"
                      ? "This subject offering will be made available to students again."
                      : activeTab === "available" && actionType === "delete"
                        ? "Choose whether to temporarily pause this offering or permanently delete it."
                        : actionType === "pause"
                          ? "This will temporarily hide the subject from students but preserve all data."
                          : "This action cannot be undone. All associated data will be permanently removed."}
                  </CardDescription>
                </CardHeader>
                
                <Separator />
                
                <CardFooter className="flex flex-col gap-3 pt-6">
                  {activeTab === "available" && actionType === "delete" ? (
                    <div className="flex flex-col w-full gap-2">
                      <Button
                        className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:cursor-pointer"
                        variant="secondary"
                        onClick={() => handlePause(selectedSubject!)}
                      >
                        Pause Temporarily
                      </Button>
                      <Button
                        className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-destructive/25 hover:cursor-pointer"
                        variant="destructive"
                        onClick={() => handleDelete(selectedSubject!)}
                      >
                        Delete Permanently
                      </Button>
                      <Button
                        className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm hover:cursor-pointer"
                        variant="outline"
                        onClick={() => setModalOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full gap-3">
                      <Button
                        className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm hover:cursor-pointer"
                        variant="outline"
                        onClick={() => setModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      {actionType === "resume" && (
                        <Button
                          className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:cursor-pointer"
                          onClick={() => handleResume(selectedSubject!)}
                        >
                          Resume
                        </Button>
                      )}
                      {actionType === "delete" && (
                        <Button
                          className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-destructive/25 hover:cursor-pointer"
                          variant="destructive"
                          onClick={() => handleDelete(selectedSubject!)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
