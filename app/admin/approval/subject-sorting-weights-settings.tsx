"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_WEIGHTS, type SortingWeights } from "@/lib/subject-sorting";

type WeightsResponse = {
  success: boolean;
  source?: "default" | "database";
  weights?: SortingWeights;
  updatedAt?: string;
  updatedBy?: string;
  error?: string;
};

const WEIGHT_FIELDS: Array<{ key: keyof SortingWeights; label: string; hint: string }> = [
  { key: "subjectRating", label: "Subject Rating", hint: "Performance in this subject" },
  { key: "tutorRating", label: "Tutor Rating", hint: "Overall tutor quality" },
  { key: "availabilities", label: "Availabilities", hint: "Schedule match and flexibility" },
  { key: "repeatBookings", label: "Repeat Bookings", hint: "Returning tutee signals" },
  { key: "bookingFrequency", label: "Booking Frequency", hint: "Overall session activity" },
  { key: "yearLevelProximity", label: "Year-Level Advantage", hint: "Prioritize tutors from higher year levels" },
];

function totalOf(weights: SortingWeights): number {
  return WEIGHT_FIELDS.reduce((sum, field) => sum + weights[field.key], 0);
}

export default function SubjectSortingWeightsSettingsPanel() {
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<SortingWeights>(DEFAULT_WEIGHTS);
  const [source, setSource] = useState<"default" | "database">("default");
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const isSuperAdmin =
    user?.publicMetadata?.isAdmin === true &&
    user?.publicMetadata?.adminRole === "superadmin";

  const total = useMemo(() => totalOf(weights), [weights]);

  const loadWeights = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/subject-sorting-weights", { method: "GET" });
      const data = (await response.json()) as WeightsResponse;

      if (!response.ok || !data.success || !data.weights) {
        throw new Error(data.error || "Failed to load sorting weights");
      }

      setWeights(data.weights);
      setSource(data.source || "default");
      setUpdatedAt(data.updatedAt);
    } catch (error) {
      console.error("Error loading subject sorting weights:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load sorting weights");
    } finally {
      setLoading(false);
    }
  };

  const saveWeights = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/subject-sorting-weights", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weights }),
      });

      const data = (await response.json()) as WeightsResponse;
      if (!response.ok || !data.success || !data.weights) {
        throw new Error(data.error || "Failed to update sorting weights");
      }

      setWeights(data.weights);
      setSource("database");
      setUpdatedAt(data.updatedAt);
      toast.success("Subject sorting weights saved");
      setOpen(false);
    } catch (error) {
      console.error("Error saving subject sorting weights:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save sorting weights");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSuperAdmin) {
      loadWeights();
    }
  }, [isLoaded, isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Subject Sorting Weights
            </CardTitle>
            <CardDescription>
              Configure global weight distribution used by the weighted subject sorting algorithm.
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Manage Weights
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Total: {total}</Badge>
          <Badge variant="outline">Source: {source === "database" ? "Database" : "Default"}</Badge>
          {updatedAt && <Badge variant="outline">Updated: {new Date(updatedAt).toLocaleString()}</Badge>}
        </div>
      </CardHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl w-fit">
          <DialogHeader>
            <DialogTitle>Edit Subject Sorting Weights</DialogTitle>
            <DialogDescription>
              Adjust each factor. Total must be exactly 100.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {WEIGHT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center gap-4 justify-between">
                  <Label htmlFor={`weight-${field.key}`}>{field.label}</Label>
                  <span className="text-xs text-muted-foreground">{field.hint}</span>
                </div>
                <Input
                  id={`weight-${field.key}`}
                  type="number"
                  min={0}
                  max={100}
                  value={weights[field.key]}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value || 0);
                    setWeights((current) => ({
                      ...current,
                      [field.key]: Number.isFinite(nextValue) ? Math.max(0, Math.min(100, Math.round(nextValue))) : 0,
                    }));
                  }}
                />
              </div>
            ))}

            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="font-medium">Total Weight</span>
              <Badge variant={total === 100 ? "secondary" : "destructive"}>{total}</Badge>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              disabled={saving}
            >
              Reset Defaults
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveWeights} disabled={saving || total !== 100}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Weights"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
