"use client";

import { useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfilePublicMetadata } from "@/app/tutor/actions";
import { toast } from "sonner";
import { CalendarDays, Loader2, Mail, User as UserIcon } from "lucide-react";

type ProfileForm = {
  bio: string;
};

const daysOfWeek = [
  { name: "M", value: "monday" },
  { name: "T", value: "tuesday" },
  { name: "W", value: "wednesday" },
  { name: "Th", value: "thursday" },
  { name: "F", value: "friday" },
  { name: "S", value: "saturday" },
  { name: "Su", value: "sunday" },
] as const;

type TimeOfDay = {
  hourOfDay: number;
  minute: number;
};

type TimeRange = {
  id: string;
  timeStart: TimeOfDay;
  timeEnd: TimeOfDay;
};

type AvailabilitySlot = {
  day: (typeof daysOfWeek)[number]["value"];
  timeRanges: TimeRange[];
};

const dayOrder = daysOfWeek.map((day) => day.value);

const sortAvailabilityByDay = (slots: AvailabilitySlot[]) => {
  return [...slots].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  );
};

const normalizeAvailability = (value: unknown): AvailabilitySlot[] => {
  if (!Array.isArray(value)) return [];

  const normalized: AvailabilitySlot[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const slot = item as Record<string, any>;
    const day = String(slot.day || "");

    if (!dayOrder.includes(day as (typeof daysOfWeek)[number]["value"])) continue;
    if (!Array.isArray(slot.timeRanges)) continue;

    const timeRanges: TimeRange[] = slot.timeRanges
      .map((range: any, idx: number) => ({
        id: String(range?.id || `${day}-${idx}-${Date.now()}`),
        timeStart: {
          hourOfDay: Number(range?.timeStart?.hourOfDay ?? 8),
          minute: Number(range?.timeStart?.minute ?? 0),
        },
        timeEnd: {
          hourOfDay: Number(range?.timeEnd?.hourOfDay ?? 14),
          minute: Number(range?.timeEnd?.minute ?? 0),
        },
      }))
      .filter(
        (range) =>
          Number.isFinite(range.timeStart.hourOfDay) &&
          Number.isFinite(range.timeStart.minute) &&
          Number.isFinite(range.timeEnd.hourOfDay) &&
          Number.isFinite(range.timeEnd.minute)
      );

    if (timeRanges.length > 0) {
      normalized.push({ day: day as AvailabilitySlot["day"], timeRanges });
    }
  }

  return sortAvailabilityByDay(normalized);
};

export default function TutorProfile() {
  const { openUserProfile } = useClerk();
  const { isLoaded, user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [form, setForm] = useState<ProfileForm>({
    bio: "",
  });

  useEffect(() => {
    if (!user) return;

    const currentPublicMetadata = user.publicMetadata as Record<string, unknown> | undefined;
    setForm({
      bio: String(currentPublicMetadata?.bio || ""),
    });
    setAvailability(normalizeAvailability(currentPublicMetadata?.tutorAvailability));
  }, [user]);

  const fullName = useMemo(() => {
    const merged = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return merged || "Unnamed Tutor";
  }, [user?.firstName, user?.lastName]);

  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "No email available";
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  const onChange = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const formatTimeOfDay = (time: TimeOfDay) => {
    const hour = String(time.hourOfDay).padStart(2, "0");
    const minute = String(time.minute).padStart(2, "0");
    return `${hour}:${minute}`;
  };

  const parseTimeToObject = (value: string): TimeOfDay => {
    const [hourPart, minutePart] = value.split(":");
    const hour = Number.parseInt(hourPart ?? "0", 10);
    const minute = Number.parseInt(minutePart ?? "0", 10);

    return {
      hourOfDay: Number.isNaN(hour) ? 0 : hour,
      minute: Number.isNaN(minute) ? 0 : minute,
    };
  };

  const toggleAvailabilityDay = (day: AvailabilitySlot["day"]) => {
    setAvailability((current) => {
      const hasDay = current.some((slot) => slot.day === day);

      if (hasDay) {
        return sortAvailabilityByDay(current.filter((slot) => slot.day !== day));
      }

      return sortAvailabilityByDay([
        ...current,
        {
          day,
          timeRanges: [
            {
              id: String(Date.now()),
              timeStart: { hourOfDay: 8, minute: 0 },
              timeEnd: { hourOfDay: 14, minute: 0 },
            },
          ],
        },
      ]);
    });
  };

  const addTimeRange = (day: AvailabilitySlot["day"]) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              timeRanges: [
                ...slot.timeRanges,
                {
                  id: String(Date.now()),
                  timeStart: { hourOfDay: 8, minute: 0 },
                  timeEnd: { hourOfDay: 14, minute: 0 },
                },
              ],
            }
          : slot
      )
    );
  };

  const removeTimeRange = (day: AvailabilitySlot["day"], rangeId: string) => {
    setAvailability((current) =>
      current
        .map((slot) =>
          slot.day === day
            ? {
                ...slot,
                timeRanges: slot.timeRanges.filter((range) => range.id !== rangeId),
              }
            : slot
        )
        .filter((slot) => slot.timeRanges.length > 0)
    );
  };

  const updateAvailabilityTime = (
    day: AvailabilitySlot["day"],
    rangeId: string,
    key: "timeStart" | "timeEnd",
    value: TimeOfDay
  ) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              timeRanges: slot.timeRanges.map((range) =>
                range.id === rangeId ? { ...range, [key]: value } : range
              ),
            }
          : slot
      )
    );
  };

  const onSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const result = await updateProfilePublicMetadata({
        availability,
        bio: form.bio,
        availabilityKey: "tutorAvailability",
      });

      if (!result?.success) {
        throw new Error(result?.error || "Failed to update availability");
      }

      await user.reload();

      toast.success("Profile updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Manage your tutor account details without leaving the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={user?.imageUrl} alt={fullName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{fullName}</h2>
                <p className="text-sm text-muted-foreground">@{user?.username || "no-username"}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {primaryEmail}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">Tutor</Badge>
              <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
                Account Settings
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => onChange("bio", e.target.value)}
              placeholder="Tell students a bit about yourself"
              rows={5}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Weekly Availability
            </h3>

            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const selected = availability.some((slot) => slot.day === day.value);
                return (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="h-9 px-3"
                    onClick={() => toggleAvailabilityDay(day.value)}
                  >
                    {day.name}
                  </Button>
                );
              })}
            </div>

            {availability.length > 0 ? (
              <div className="space-y-4">
                {availability.map((slot) => (
                  <div key={slot.day} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{slot.day}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeRange(slot.day)}
                      >
                        Add Time Range
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {slot.timeRanges.map((range) => (
                        <div key={range.id} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <Input
                            type="time"
                            value={formatTimeOfDay(range.timeStart)}
                            onChange={(e) =>
                              updateAvailabilityTime(
                                slot.day,
                                range.id,
                                "timeStart",
                                parseTimeToObject(e.target.value)
                              )
                            }
                            className="w-full sm:w-44"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            value={formatTimeOfDay(range.timeEnd)}
                            onChange={(e) =>
                              updateAvailabilityTime(
                                slot.day,
                                range.id,
                                "timeEnd",
                                parseTimeToObject(e.target.value)
                              )
                            }
                            className="w-full sm:w-44"
                          />

                          {slot.timeRanges.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimeRange(slot.day, range.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select at least one day to set your schedule availability.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isSaving || !user}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
