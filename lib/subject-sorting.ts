/**
 * Weighted Algorithm for Subject/Offering Sorting
 * 
 * This module provides a flexible, weighted-based algorithm for sorting tutoring offerings.
 * Weights can be easily adjusted and new categories can be added.
 */

export interface SortingWeights {
  subjectRating: number;      // Rating for the specific subject offering
  tutorRating: number;         // Overall tutor rating (future: across all subjects)
  availabilities: number;      // Diversity of days offered
  repeatBookings: number;      // Number of unique tutees who booked multiple times
  bookingFrequency: number;    // Total number of completed/accepted appointments
}

export interface OfferingStats {
  _id: string;
  averageRating: number;       // Subject-specific rating
  totalReviews: number;
  availabilityCount: number;   // Number of unique days with availability
  repeatBookingsCount: number; // Number of tutees with 2+ bookings
  totalBookingsCount: number;  // Total completed/accepted appointments
  // Add future metrics here
}

export interface Offering extends Partial<OfferingStats> {
  _id: string;
  subject: string;
  description: string;
  availability?: Array<{ id: string; day: string; start: string; end: string }>;
  [key: string]: any;
}

export interface TuteeAvailabilityTime {
  hourOfDay: number;
  minute: number;
}

export interface TuteeAvailabilityRange {
  id?: string;
  timeStart: TuteeAvailabilityTime;
  timeEnd: TuteeAvailabilityTime;
}

export interface TuteeAvailabilitySlot {
  day: string;
  timeRanges: TuteeAvailabilityRange[];
}

export interface ScoringOptions {
  tuteeAvailability?: TuteeAvailabilitySlot[];
}

/**
 * Default weights for the sorting algorithm
 * Total should equal 100 for percentage-based weighting
 */
export const DEFAULT_WEIGHTS: SortingWeights = {
  subjectRating: 40,
  tutorRating: 30,
  availabilities: 15,
  repeatBookings: 10,
  bookingFrequency: 5,
};

export const AVAILABILITY_WEIGHTS: SortingWeights = {
  subjectRating: 10,
  tutorRating: 10,
  availabilities: 75,
  repeatBookings: 2.5,
  bookingFrequency: 2.5,
};

/**
 * Normalization ranges for each metric
 * These define what we consider "excellent" values for scaling
 */
const NORMALIZATION_TARGETS = {
  subjectRating: 5.0,           // Max rating
  tutorRating: 5.0,             // Max rating
  availabilities: 3,            // Having all 7 days is excellent (fallback metric)
  availabilityOverlapMinutes: 120, // 6 hours/week of overlap is excellent
  repeatBookings: 5,           // 10+ repeat students is excellent
  bookingFrequency: 10,         // 20+ bookings in last 30 days is excellent
};

/**
 * Bayesian average constants for confidence-weighted ratings
 * This prevents ratings with very few reviews from ranking too high
 */
const BAYESIAN_CONSTANTS = {
  MINIMUM_REVIEWS: 5,           // Number of reviews needed for full confidence
  PRIOR_RATING: 1,            // Assumed rating for new offerings (neutral)
};

/**
 * Calculate confidence-weighted rating using Bayesian average
 * This accounts for the number of reviews - ratings with more reviews are more trusted
 * 
 * Formula: (avgRating * reviewCount + priorRating * minReviews) / (reviewCount + minReviews)
 * 
 * @param rating - The average rating
 * @param reviewCount - Number of reviews
 * @returns Confidence-weighted rating
 */
function calculateConfidenceWeightedRating(rating: number, reviewCount: number): number {
  if (rating <= 0) return BAYESIAN_CONSTANTS.PRIOR_RATING;
  
  const { MINIMUM_REVIEWS, PRIOR_RATING } = BAYESIAN_CONSTANTS;
  
  // Bayesian average formula
  const weightedRating = (
    (rating * reviewCount) + (PRIOR_RATING * MINIMUM_REVIEWS)
  ) / (reviewCount + MINIMUM_REVIEWS);
  
  return weightedRating;
}

/**
 * Calculate a normalized score (0-1) for a metric
 * Uses logarithmic scaling for booking-related metrics to prevent extreme outliers
 * 
 * @param value - The actual value
 * @param target - The target/excellent value
 * @param useLog - Whether to use logarithmic scaling (good for unbounded metrics)
 */
function normalizeMetric(value: number, target: number, useLog: boolean = false): number {
  if (value <= 0) return 0;
  
  if (useLog) {
    // Logarithmic scaling: log(value + 1) / log(target + 1)
    // This prevents extremely popular tutors from dominating
    const normalizedValue = Math.log(value + 1) / Math.log(target + 1);
    return Math.min(normalizedValue, 1);
  }
  
  // Linear scaling
  return Math.min(value / target, 1);
}

function normalizeDay(day: string): string {
  return day.trim().toLowerCase();
}

function parseTimeToMinutes(time: string): number {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function overlapMinutes(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function hasTuteeAvailability(tuteeAvailability?: TuteeAvailabilitySlot[]): boolean {
  if (!tuteeAvailability || tuteeAvailability.length === 0) return false;

  return tuteeAvailability.some(
    (slot) => Array.isArray(slot.timeRanges) && slot.timeRanges.length > 0
  );
}

export function calculateAvailabilityOverlapMinutes(
  offeringAvailability?: Array<{ day: string; start: string; end: string }>,
  tuteeAvailability?: TuteeAvailabilitySlot[]
): number {
  if (
    !offeringAvailability ||
    offeringAvailability.length === 0 ||
    !tuteeAvailability ||
    tuteeAvailability.length === 0
  ) {
    return 0;
  }

  const tuteeByDay = new Map<string, Array<{ start: number; end: number }>>();

  for (const slot of tuteeAvailability) {
    const day = normalizeDay(slot.day);
    if (!day || !Array.isArray(slot.timeRanges)) continue;

    const ranges = slot.timeRanges
      .map((range) => {
        const start = (range?.timeStart?.hourOfDay ?? 0) * 60 + (range?.timeStart?.minute ?? 0);
        const end = (range?.timeEnd?.hourOfDay ?? 0) * 60 + (range?.timeEnd?.minute ?? 0);
        return { start, end };
      })
      .filter((range) => range.end > range.start);

    if (ranges.length === 0) continue;

    const existing = tuteeByDay.get(day) || [];
    existing.push(...ranges);
    tuteeByDay.set(day, existing);
  }

  let totalOverlap = 0;

  for (const slot of offeringAvailability) {
    const day = normalizeDay(slot.day);
    const tutorStart = parseTimeToMinutes(slot.start);
    const tutorEnd = parseTimeToMinutes(slot.end);

    if (!day || tutorEnd <= tutorStart) continue;

    const tuteeRanges = tuteeByDay.get(day) || [];
    for (const range of tuteeRanges) {
      totalOverlap += overlapMinutes(tutorStart, tutorEnd, range.start, range.end);
    }
  }

  return totalOverlap;
}

/**
 * Calculate the weighted score for a single offering
 * 
 * @param offering - The offering to score
 * @param weights - The weights to apply (defaults to DEFAULT_WEIGHTS)
 * @returns A score between 0-100
 */
export function calculateOfferingScore(
  offering: Offering,
  weights: SortingWeights = DEFAULT_WEIGHTS,
  options: ScoringOptions = {}
): number {
  // Extract metrics with defaults
  const rawSubjectRating = offering.averageRating || 0;
  const rawTutorRating = offering.averageRating || 0;
  const reviewCount = offering.totalReviews || 0;
  const availabilities = offering.availabilityCount || 0;
  const availabilityOverlapMinutes = calculateAvailabilityOverlapMinutes(
    offering.availability,
    options.tuteeAvailability
  );
  const hasAvailabilityContext = hasTuteeAvailability(options.tuteeAvailability);
  const repeatBookings = offering.repeatBookingsCount || 0;
  const bookingFrequency = offering.totalBookingsCount || 0;

  // Apply confidence weighting to ratings based on number of reviews
  // This prevents offerings with 1 five-star review from ranking above those with 20 4.5-star reviews
  const subjectRating = calculateConfidenceWeightedRating(rawSubjectRating, reviewCount);
  const tutorRating = calculateConfidenceWeightedRating(rawTutorRating, reviewCount);

  // Normalize each metric to 0-1 scale
  const normalizedSubjectRating = normalizeMetric(
    subjectRating,
    NORMALIZATION_TARGETS.subjectRating,
    false
  );
  
  const normalizedTutorRating = normalizeMetric(
    tutorRating,
    NORMALIZATION_TARGETS.tutorRating,
    false
  );
  
  const normalizedAvailabilities = hasAvailabilityContext
    ? normalizeMetric(
        availabilityOverlapMinutes,
        NORMALIZATION_TARGETS.availabilityOverlapMinutes,
        false
      )
    : normalizeMetric(
        availabilities,
        NORMALIZATION_TARGETS.availabilities,
        false
      );
  
  const normalizedRepeatBookings = normalizeMetric(
    repeatBookings,
    NORMALIZATION_TARGETS.repeatBookings,
    true // Use log scaling
  );
  
  const normalizedBookingFrequency = normalizeMetric(
    bookingFrequency,
    NORMALIZATION_TARGETS.bookingFrequency,
    true // Use log scaling
  );

  // Calculate weighted score
  const score = (
    normalizedSubjectRating * weights.subjectRating +
    normalizedTutorRating * weights.tutorRating +
    normalizedAvailabilities * weights.availabilities +
    normalizedRepeatBookings * weights.repeatBookings +
    normalizedBookingFrequency * weights.bookingFrequency
  );

  return score;
}

/**
 * Sort offerings by weighted score
 * 
 * @param offerings - Array of offerings to sort
 * @param weights - The weights to apply (defaults to DEFAULT_WEIGHTS)
 * @returns Sorted array (highest score first)
 */
export function sortOfferingsByScore(
  offerings: Offering[],
  weights: SortingWeights = DEFAULT_WEIGHTS,
  options: ScoringOptions = {}
): Offering[] {
  return [...offerings].sort((a, b) => {
    const scoreA = calculateOfferingScore(a, weights, options);
    const scoreB = calculateOfferingScore(b, weights, options);
    
    // Sort by score (highest first)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    // Tiebreaker: subject name alphabetically
    return a.subject.localeCompare(b.subject);
  });
}

/**
 * Calculate diversity of days offered
 * 
 * @param availability - Array of availability slots
 * @returns Number of unique days (0-7)
 */
export function calculateAvailabilityDiversity(
  availability?: Array<{ day: string; [key: string]: any }>
): number {
  if (!availability || availability.length === 0) return 0;
  
  const uniqueDays = new Set(availability.map(slot => slot.day));
  return uniqueDays.size;
}

/**
 * Helper function to add calculated stats to offerings
 * Use this before sorting when stats aren't already included
 * 
 * @param offerings - Array of offerings
 * @returns Offerings with calculated availability diversity
 */
export function enrichOfferingsWithStats(offerings: Offering[]): Offering[] {
  return offerings.map(offering => ({
    ...offering,
    availabilityCount: offering.availabilityCount ?? calculateAvailabilityDiversity(offering.availability),
  }));
}

/**
 * Custom weight presets for different use cases
 */
export const WEIGHT_PRESETS = {
  QUALITY_FOCUSED: {
    subjectRating: 50,
    tutorRating: 35,
    availabilities: 10,
    repeatBookings: 3,
    bookingFrequency: 2,
  } as SortingWeights,
  
  AVAILABILITY_FOCUSED: {
    subjectRating: 25,
    tutorRating: 20,
    availabilities: 35,
    repeatBookings: 10,
    bookingFrequency: 10,
  } as SortingWeights,
  
  POPULARITY_FOCUSED: {
    subjectRating: 20,
    tutorRating: 20,
    availabilities: 10,
    repeatBookings: 25,
    bookingFrequency: 25,
  } as SortingWeights,
  
  BALANCED: DEFAULT_WEIGHTS,
};

/**
 * Get a debug breakdown of how a score was calculated
 * Useful for testing and understanding why offerings are ranked a certain way
 */
export function getScoreBreakdown(
  offering: Offering,
  weights: SortingWeights = DEFAULT_WEIGHTS,
  options: ScoringOptions = {}
): {
  totalScore: number;
  breakdown: {
    metric: string;
    value: number;
    normalized: number;
    weight: number;
    contribution: number;
  }[];
} {
  const rawSubjectRating = offering.averageRating || 0;
  const rawTutorRating = offering.averageRating || 0;
  const reviewCount = offering.totalReviews || 0;
  const availabilities = offering.availabilityCount || 0;
  const availabilityOverlapMinutes = calculateAvailabilityOverlapMinutes(
    offering.availability,
    options.tuteeAvailability
  );
  const hasAvailabilityContext = hasTuteeAvailability(options.tuteeAvailability);
  const repeatBookings = offering.repeatBookingsCount || 0;
  const bookingFrequency = offering.totalBookingsCount || 0;

  // Apply confidence weighting
  const subjectRating = calculateConfidenceWeightedRating(rawSubjectRating, reviewCount);
  const tutorRating = calculateConfidenceWeightedRating(rawTutorRating, reviewCount);

  const metrics = [
    {
      metric: 'Subject Rating',
      value: subjectRating,
      normalized: normalizeMetric(subjectRating, NORMALIZATION_TARGETS.subjectRating, false),
      weight: weights.subjectRating,
    },
    {
      metric: 'Tutor Rating',
      value: tutorRating,
      normalized: normalizeMetric(tutorRating, NORMALIZATION_TARGETS.tutorRating, false),
      weight: weights.tutorRating,
    },
    {
      metric: hasAvailabilityContext ? 'Availability Overlap (Minutes)' : 'Availabilities',
      value: hasAvailabilityContext ? availabilityOverlapMinutes : availabilities,
      normalized: hasAvailabilityContext
        ? normalizeMetric(availabilityOverlapMinutes, NORMALIZATION_TARGETS.availabilityOverlapMinutes, false)
        : normalizeMetric(availabilities, NORMALIZATION_TARGETS.availabilities, false),
      weight: weights.availabilities,
    },
    {
      metric: 'Repeat Bookings',
      value: repeatBookings,
      normalized: normalizeMetric(repeatBookings, NORMALIZATION_TARGETS.repeatBookings, true),
      weight: weights.repeatBookings,
    },
    {
      metric: 'Booking Frequency',
      value: bookingFrequency,
      normalized: normalizeMetric(bookingFrequency, NORMALIZATION_TARGETS.bookingFrequency, true),
      weight: weights.bookingFrequency,
    },
  ];

  const breakdown = metrics.map(m => ({
    ...m,
    contribution: m.normalized * m.weight,
  }));

  const totalScore = breakdown.reduce((sum, item) => sum + item.contribution, 0);

  return { totalScore, breakdown };
}
