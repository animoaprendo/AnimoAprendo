import "server-only";

import clientPromise from "@/lib/mongodb";
import { DEFAULT_WEIGHTS, type SortingWeights } from "@/lib/subject-sorting";

const COLLECTION_NAME = "subjectSortingSettings";
const SETTINGS_KEY = "global";

const WEIGHT_KEYS: Array<keyof SortingWeights> = [
  "subjectRating",
  "tutorRating",
  "availabilities",
  "repeatBookings",
  "bookingFrequency",
  "yearLevelProximity",
];

export type SubjectSortingWeightsDocument = {
  key: string;
  weights: SortingWeights;
  updatedAt: Date;
  updatedBy: string;
};

export function sanitizeSortingWeights(
  input: Partial<Record<keyof SortingWeights, unknown>> | null | undefined
): SortingWeights {
  return {
    subjectRating: sanitizeWeight(input?.subjectRating, DEFAULT_WEIGHTS.subjectRating),
    tutorRating: sanitizeWeight(input?.tutorRating, DEFAULT_WEIGHTS.tutorRating),
    availabilities: sanitizeWeight(input?.availabilities, DEFAULT_WEIGHTS.availabilities),
    repeatBookings: sanitizeWeight(input?.repeatBookings, DEFAULT_WEIGHTS.repeatBookings),
    bookingFrequency: sanitizeWeight(input?.bookingFrequency, DEFAULT_WEIGHTS.bookingFrequency),
    yearLevelProximity: sanitizeWeight(input?.yearLevelProximity, DEFAULT_WEIGHTS.yearLevelProximity),
  };
}

export function getWeightsTotal(weights: SortingWeights): number {
  return WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

export function hasValidWeightsTotal(weights: SortingWeights): boolean {
  return getWeightsTotal(weights) === 100;
}

function normalizeWeightsToHundred(weights: SortingWeights): SortingWeights {
  const total = getWeightsTotal(weights);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };

  const keys: Array<keyof SortingWeights> = [
    "subjectRating",
    "tutorRating",
    "availabilities",
    "repeatBookings",
    "bookingFrequency",
    "yearLevelProximity",
  ];

  const normalized = keys.map((key) => ({
    key,
    raw: (weights[key] / total) * 100,
  }));

  const floored = normalized.map((item) => ({
    key: item.key,
    value: Math.floor(item.raw),
    fraction: item.raw - Math.floor(item.raw),
  }));

  let remainder = 100 - floored.reduce((sum, item) => sum + item.value, 0);
  floored.sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; remainder > 0 && index < floored.length; index += 1) {
    floored[index].value += 1;
    remainder -= 1;
  }

  const result = { ...DEFAULT_WEIGHTS };
  floored.forEach((item) => {
    result[item.key] = item.value;
  });

  return result;
}

export async function getSubjectSortingWeights(): Promise<SortingWeights> {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("main");
    const doc = await db.collection(COLLECTION_NAME).findOne({ key: SETTINGS_KEY });

    if (!doc?.weights || typeof doc.weights !== "object") {
      return { ...DEFAULT_WEIGHTS };
    }

    const parsed = sanitizeSortingWeights(doc.weights as Partial<Record<keyof SortingWeights, unknown>>);
    if (!hasValidWeightsTotal(parsed)) {
      return normalizeWeightsToHundred(parsed);
    }

    return parsed;
  } catch (error) {
    console.error("Error loading subject sorting weights:", error);
    return { ...DEFAULT_WEIGHTS };
  }
}

function sanitizeWeight(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return Math.round(parsed);
}
