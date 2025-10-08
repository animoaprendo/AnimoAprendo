"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import ReactQuill from "react-quill-new";
// @ts-ignore
import "react-quill-new/dist/quill.snow.css";
import { CreatePopup } from "@/app/tutor/alert";
import { uploadBannerServer } from "@/app/tutor/actions";
import { useUser } from "@clerk/nextjs";
import { ClipLoader, MoonLoader, RiseLoader } from "react-spinners";
import { CircleCheckBig } from "@/components/animate-ui/icons/circle-check-big";
import { CircleX } from "@/components/animate-ui/icons/circle-x";

const QuillEditor = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    return forwardRef<ReactQuill, any>((props, ref) => (
      <RQ {...props} ref={ref} />
    ));
  },
  { ssr: false }
);

type Slot = { id: string; day: string; start: string; end: string };
type Props = {
  subject: string;
  setSubject: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  descriptionLength: number;
  setDescriptionLength: (val: number) => void;
  availability: Slot[];
  setAvailability: (val: Slot[]) => void;
  banner: string;
  setBanner: (val: string) => void;
};

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Computer Science",
];
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return {
    value: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    label: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
  };
});

export default function OfferDetails({
  subject,
  setSubject,
  description,
  setDescription,
  descriptionLength,
  setDescriptionLength,
  availability,
  setAvailability,
  banner,
  setBanner,
}: Props) {
  const { user } = useUser();
  const [isPreview, setIsPreview] = useState(false);
  const [submitState, setSubmitState] = useState<
    "default" | "saving" | "success" | "failed"
  >("default");
  const quillRef = useRef<ReactQuill | null>(null);

  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      setDescriptionLength(editor.getLength() - 1);
    }
  }, [description]);

  const handleAddSlot = () =>
    setAvailability([
      ...availability,
      { id: crypto.randomUUID(), day: "Monday", start: "08:00", end: "09:00" },
    ]);
  const handleUpdateSlot = (id: string, key: keyof Slot, value: string) =>
    setAvailability(
      availability.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    );
  const handleRemoveSlot = (id: string) =>
    setAvailability(availability.filter((s) => s.id !== id));

  const uploadBanner = (file: File) => {
    setSubmitState("saving");
    CreatePopup("Uploading image", "info");
    uploadBannerServer(file, user?.username || "").then((data) => {
      if (data.success) {
        setSubmitState("success");
        setBanner(data.data.url);
        CreatePopup("Image uploaded", "success");
      } else {
        setSubmitState("failed");
        CreatePopup("Unable to upload, try again.", "error");
      }

      setTimeout(() => {
        setSubmitState("default");
      }, 1500);
    });
  };

  return (
    <div className="flex flex-col gap-6 md:w-11/12 mx-auto py-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-green-900">
          📘 Create a Tutoring Offer
        </h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg w-full lg:w-fit"
          onClick={() => setIsPreview(!isPreview)}
        >
          {isPreview ? "Switch to Edit Mode" : "Preview Offer"}
        </button>
      </div>

      {!isPreview ? (
        <div className="space-y-6">
          <div>
            <label className="block mb-1 font-semibold">Subject Name</label>
            <select
              className="w-full border p-2 rounded-lg"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Select a subject</option>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Subject Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                e.target.files?.[0] && uploadBanner(e.target.files[0])
              }
            />
            {submitState !== "default" && (
              <>
                {submitState === "saving" && (
                  <div className="flex items-center gap-2 mt-2 font-semibold text-green-900">
                    <ClipLoader color="#0d542b" size={20} />
                    <p className="animate-pulse">Uploading</p>
                  </div>
                )}
                {submitState === "success" && (
                  <div className="flex items-center gap-2 mt-2 font-semibold text-green-900">
                    <CircleCheckBig animateOnView color="#0d542b" size={20} />
                    <p>Success</p>
                  </div>
                )}
                {submitState === "failed" && (
                  <div className="flex items-center gap-2 mt-2 font-semibold text-red-600">
                    <CircleX animateOnView color="#ff0613" size={20} />
                    <p>Failed</p>
                  </div>
                )}
              </>
            )}
            {banner && (
              <img
                src={banner}
                alt="Subject Preview"
                className="mt-3 max-h-40 rounded-lg object-cover"
              />
            )}
          </div>

          <QuillEditor
            ref={quillRef}
            theme="snow"
            value={description}
            onChange={setDescription}
            className="text-black rounded-md h-40"
          />

          <div className="mt-20 sm:mt-16">
            <label className="block mb-2 font-semibold">
              Weekly Availability
            </label>
            <div className="space-y-4">
              {availability.map((slot) => (
                <div
                  key={slot.id}
                  className="border p-3 rounded-lg space-y-2 bg-gray-50"
                >
                  <div className="flex flex-row flex-wrap lg:flex-nowrap sm:flex-row gap-3 items-center">
                    <select
                      value={slot.day}
                      onChange={(e) =>
                        handleUpdateSlot(slot.id, "day", e.target.value)
                      }
                      className="border p-2 rounded-lg w-full"
                    >
                      {DAYS.map((day) => (
                        <option key={day}>{day}</option>
                      ))}
                    </select>
                    <select
                      value={slot.start}
                      onChange={(e) =>
                        handleUpdateSlot(slot.id, "start", e.target.value)
                      }
                      className="border p-2 rounded-lg"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span>to</span>
                    <select
                      value={slot.end}
                      onChange={(e) =>
                        handleUpdateSlot(slot.id, "end", e.target.value)
                      }
                      className="border p-2 rounded-lg"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-white bg-red-500 hover:bg-red-600 aspect-square lg:aspect-auto"
                      onClick={() => handleRemoveSlot(slot.id)}
                    >
                      <Trash2 size={16} />
                      <span className="hidden lg:block">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddSlot}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              + Add Availability
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 rounded-2xl overflow-hidden shadow-lg bg-white">
            <figure className="h-72 w-full">
              <Image
                src={
                  banner || "https://placehold.co/1200x1200.png?text=No+Image"
                }
                alt={subject}
                width={600}
                height={300}
                className="w-full h-full object-cover"
                unoptimized
              />
            </figure>
            <div className="p-6 space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold text-green-900">
                {subject || "—"}
              </h1>
              <div
                className="prose prose-sm max-w-none text-gray-700 [&_li[data-list='ordered']]:list-decimal [&_li[data-list='ordered']]:pl-6 [&_li[data-list='bullet']]:list-disc [&_li[data-list='bullet']]:pl-6 [&_.ql-ui]:hidden"
                dangerouslySetInnerHTML={{ __html: description }}
              />
              {availability.length > 0 && (
                <div className="mt-4">
                  <h2 className="font-semibold text-lg">Availability</h2>
                  <ul className="flex flex-wrap gap-2 mt-2">
                    {availability.map((slot) => (
                      <li
                        key={slot.id}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                      >
                        {slot.day} {slot.start}–{slot.end}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
