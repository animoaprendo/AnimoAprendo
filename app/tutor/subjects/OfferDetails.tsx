"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Trash2,
  Upload,
  Eye,
  Edit,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ReactQuill from "react-quill-new";
// @ts-ignore
import "react-quill-new/dist/quill.snow.css";
import { CreatePopup } from "@/app/tutor/alert";
import { uploadBannerServer } from "@/app/tutor/actions";
import { useUser } from "@clerk/nextjs";
import { ClipLoader, MoonLoader, RiseLoader } from "react-spinners";
import { CircleCheckBig } from "@/components/animate-ui/icons/circle-check-big";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getCollectionData } from "@/app/actions";

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
  const [SUBJECTS, setSUBJECTS] = useState<any[]>([]);

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

  useEffect(() => {
    getCollectionData("subjectOptions").then((data) => {
      if (data.success && Array.isArray(data.data)) {
        const allSubjects = data.data.map((item: any) => item);
        
        const userDept = (user?.publicMetadata as any)?.collegeInformation?.department as string | undefined;

        // Filter subjects by department
        const filteredSubjects = allSubjects.filter((s: any) => s.department === userDept || s.department === "General");        
        setSUBJECTS(filteredSubjects);
      }
    });
  }, [user]);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subject Details</h2>
          <p className="text-muted-foreground">
            Configure your tutoring offer settings and availability
          </p>
        </div>
        <Button
          variant={isPreview ? "outline" : "secondary"}
          onClick={() => setIsPreview(!isPreview)}
          className="w-full sm:w-auto"
        >
          {isPreview ? (
            <>
              <Edit className="w-4 h-4 mr-2" />
              Edit Mode
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </>
          )}
        </Button>
      </div>

      {!isPreview ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Choose your subject and upload a banner image to attract
                students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Name</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s._id} value={s.subjectCode}>
                        {s.subjectCode} - {s.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner">Banner Image</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadBanner(e.target.files[0])
                    }
                  />
                  <Label htmlFor="banner" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2 mx-auto">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Click to upload banner image
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </div>
                  </Label>
                </div>

                {submitState !== "default" && (
                  <div className="mt-3">
                    {submitState === "saving" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipLoader color="hsl(var(--primary))" size={16} />
                        <span>Uploading image...</span>
                      </div>
                    )}
                    {submitState === "success" && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Image uploaded successfully</span>
                      </div>
                    )}
                    {submitState === "failed" && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <XCircle className="w-4 h-4" />
                        <span>Upload failed. Please try again.</span>
                      </div>
                    )}
                  </div>
                )}

                {banner && (
                  <div className="mt-3">
                    <img
                      src={banner}
                      alt="Subject Preview"
                      className="max-h-32 w-full object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
              <CardDescription>
                Provide a detailed description of your tutoring approach and
                what students can expect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[200px]">
                <QuillEditor
                  ref={quillRef}
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  className="bg-background border rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Availability
              </CardTitle>
              <CardDescription>
                Set your available time slots for tutoring sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availability.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No availability slots added yet</p>
                  <p className="text-sm">
                    Add your first availability slot to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availability.map((slot) => (
                    <Card key={slot.id} className="p-4">
                      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Day
                            </Label>
                            <Select
                              value={slot.day}
                              onValueChange={(value) =>
                                handleUpdateSlot(slot.id, "day", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Start Time
                            </Label>
                            <Select
                              value={slot.start}
                              onValueChange={(value) =>
                                handleUpdateSlot(slot.id, "start", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              End Time
                            </Label>
                            <Select
                              value={slot.end}
                              onValueChange={(value) =>
                                handleUpdateSlot(slot.id, "end", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="text-destructive hover:text-white/98 hover:bg-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                onClick={handleAddSlot}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Availability Slot
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="h-64 w-full relative">
            <Image
              src={banner || "https://placehold.co/1200x600.png?text=No+Image"}
              alt={subject || "Subject preview"}
              width={1200}
              height={600}
              className="w-full h-full object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6 text-white">
              <h1 className="text-3xl font-bold mb-2">
                {subject || "Subject Title"}
              </h1>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              {description ? (
                <div
                  className="prose prose-sm max-w-none [&_li[data-list='ordered']]:list-decimal [&_li[data-list='ordered']]:pl-6 [&_li[data-list='bullet']]:list-disc [&_li[data-list='bullet']]:pl-6 [&_.ql-ui]:hidden"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  No description provided
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Availability
              </h3>
              {availability.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availability.map((slot) => (
                    <div
                      key={slot.id}
                      className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium border border-primary/20"
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.day}
                      </div>
                      <div className="text-xs opacity-80">
                        {slot.start} - {slot.end}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No availability slots added
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
