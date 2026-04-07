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
  normalizationContext?: MetricNormalizationContext;
}

interface MetricRange {
  lower: number;
  upper: number;
}

interface MetricNormalizationContext {
  subjectRatingRange: MetricRange | null;
  tutorRatingRange: MetricRange | null;
  availabilityOverlapRange: MetricRange | null;
  availabilityDiversityRange: MetricRange | null;
  repeatBookingsRange: MetricRange | null;
  bookingFrequencyRange: MetricRange | null;
  hasAvailabilityContext: boolean;
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
  subjectRating: 15,
  tutorRating: 5,
  availabilities: 70,
  repeatBookings: 5,
  bookingFrequency: 5,
};

/**
 * Normalization ranges for each metric
 * These define what we consider "excellent" values for scaling
 */
const NORMALIZATION_TARGETS = {
  subjectRating: 5.0,           // Max rating
  tutorRating: 5.0,             // Max rating
  availabilities: 3,            // Having all 7 days is excellent (fallback metric)
  availabilityOverlapMinutes: 360, // 6 hours/week of overlap is excellent
  repeatBookings: 5,           // 10+ repeat students is excellent
  bookingFrequency: 10,         // 20+ bookings in last 30 days is excellent
};

const NEUTRAL_DEFAULTS = {
  subjectRating: NORMALIZATION_TARGETS.subjectRating / 2,
  tutorRating: NORMALIZATION_TARGETS.tutorRating / 2,
  repeatBookings: NORMALIZATION_TARGETS.repeatBookings / 2,
  bookingFrequency: NORMALIZATION_TARGETS.bookingFrequency / 2,
};

/**
 * Bayesian average constants for confidence-weighted ratings
 * This prevents ratings with very few reviews from ranking too high
 */
const BAYESIAN_CONSTANTS = {
  MINIMUM_REVIEWS: 5,           // Number of reviews needed for full confidence
  PRIOR_RATING: 1,            // Assumed rating for new offerings (neutral)
};

const ROBUST_PERCENTILES = {
  lower: 0.1,
  upper: 0.9,
};

const AVAILABILITY_BLEND = {
  overlap: 0.7,
  diversity: 0.3,
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function percentileFromSorted(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = clamp01(percentile) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return (
    sortedValues[lowerIndex] * (1 - weight) +
    sortedValues[upperIndex] * weight
  );
}

function buildMetricRange(values: number[]): MetricRange | null {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return null;

  const sortedValues = [...finiteValues].sort((a, b) => a - b);
  const lower = percentileFromSorted(sortedValues, ROBUST_PERCENTILES.lower);
  const upper = percentileFromSorted(sortedValues, ROBUST_PERCENTILES.upper);

  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
    return null;
  }

  return { lower, upper };
}

function normalizeWithContext(
  value: number,
  range: MetricRange | null,
  fallbackTarget: number,
  useLog: boolean = false
): number {
  if (value <= 0) return 0;

  const transformedValue = useLog ? Math.log(value + 1) : value;
  const transformedFallbackTarget = useLog ? Math.log(fallbackTarget + 1) : fallbackTarget;

  if (!range) {
    return normalizeMetric(value, fallbackTarget, useLog);
  }

  const normalized = (transformedValue - range.lower) / (range.upper - range.lower);
  return clamp01(normalized);
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

function getOfferingMetricValues(
  offering: Offering,
  options: ScoringOptions = {}
): {
  subjectRating: number;
  tutorRating: number;
  reviewCount: number;
  availabilityOverlapMinutes: number;
  availabilityDiversity: number;
  repeatBookings: number;
  bookingFrequency: number;
} {
  const rawSubjectRating = offering.averageRating || 0;
  const rawTutorRating = offering.averageRating || 0;
  const reviewCount = offering.totalReviews || 0;

  return {
    subjectRating: calculateConfidenceWeightedRating(rawSubjectRating, reviewCount),
    tutorRating: calculateConfidenceWeightedRating(rawTutorRating, reviewCount),
    reviewCount,
    availabilityOverlapMinutes: calculateAvailabilityOverlapMinutes(
      offering.availability,
      options.tuteeAvailability
    ),
    availabilityDiversity: offering.availabilityCount ?? calculateAvailabilityDiversity(offering.availability),
    repeatBookings: offering.repeatBookingsCount || 0,
    bookingFrequency: offering.totalBookingsCount || 0,
  };
}

function buildNormalizationContext(
  offerings: Offering[],
  options: ScoringOptions = {}
): MetricNormalizationContext {
  const hasAvailabilityContext = hasTuteeAvailability(options.tuteeAvailability);
  const metricValues = offerings.map((offering) => getOfferingMetricValues(offering, options));

  return {
    subjectRatingRange: buildMetricRange(metricValues.map((m) => m.subjectRating)),
    tutorRatingRange: buildMetricRange(metricValues.map((m) => m.tutorRating)),
    availabilityOverlapRange: buildMetricRange(metricValues.map((m) => m.availabilityOverlapMinutes)),
    availabilityDiversityRange: buildMetricRange(metricValues.map((m) => m.availabilityDiversity)),
    repeatBookingsRange: buildMetricRange(metricValues.map((m) => Math.log(m.repeatBookings + 1))),
    bookingFrequencyRange: buildMetricRange(metricValues.map((m) => Math.log(m.bookingFrequency + 1))),
    hasAvailabilityContext,
  };
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
  const context = options.normalizationContext;
  const metrics = getOfferingMetricValues(offering, options);
  const hasAvailabilityContext = context?.hasAvailabilityContext ?? hasTuteeAvailability(options.tuteeAvailability);
  const hasReviewSignals = metrics.reviewCount > 0;
  const hasBookingSignals = metrics.bookingFrequency > 0;

  const effectiveSubjectRating = hasReviewSignals
    ? metrics.subjectRating
    : NEUTRAL_DEFAULTS.subjectRating;
  const effectiveTutorRating = hasReviewSignals
    ? metrics.tutorRating
    : NEUTRAL_DEFAULTS.tutorRating;
  const effectiveRepeatBookings = hasBookingSignals
    ? metrics.repeatBookings
    : NEUTRAL_DEFAULTS.repeatBookings;
  const effectiveBookingFrequency = hasBookingSignals
    ? metrics.bookingFrequency
    : NEUTRAL_DEFAULTS.bookingFrequency;

  // Normalize each metric to 0-1 scale
  const normalizedSubjectRating = normalizeWithContext(
    effectiveSubjectRating,
    context?.subjectRatingRange ?? null,
    NORMALIZATION_TARGETS.subjectRating,
    false
  );
  
  const normalizedTutorRating = normalizeWithContext(
    effectiveTutorRating,
    context?.tutorRatingRange ?? null,
    NORMALIZATION_TARGETS.tutorRating,
    false
  );

  const normalizedAvailabilityOverlap = normalizeWithContext(
    metrics.availabilityOverlapMinutes,
    context?.availabilityOverlapRange ?? null,
    NORMALIZATION_TARGETS.availabilityOverlapMinutes,
    false
  );

  const normalizedAvailabilityDiversity = normalizeWithContext(
    metrics.availabilityDiversity,
    context?.availabilityDiversityRange ?? null,
    NORMALIZATION_TARGETS.availabilities,
    false
  );
  
  const normalizedAvailabilities = hasAvailabilityContext
    ? (
        metrics.availabilityOverlapMinutes > 0
          ? (
              normalizedAvailabilityOverlap * AVAILABILITY_BLEND.overlap +
              normalizedAvailabilityDiversity * AVAILABILITY_BLEND.diversity
            )
          : 0
      )
    : normalizedAvailabilityDiversity;
  
  const normalizedRepeatBookings = normalizeWithContext(
    effectiveRepeatBookings,
    context?.repeatBookingsRange ?? null,
    NORMALIZATION_TARGETS.repeatBookings,
    true // Use log scaling
  );
  
  const normalizedBookingFrequency = normalizeWithContext(
    effectiveBookingFrequency,
    context?.bookingFrequencyRange ?? null,
    NORMALIZATION_TARGETS.bookingFrequency,
    true // Use log scaling
  );

  const normalizedSubjectScore = hasReviewSignals ? normalizedSubjectRating : 0.5;
  const normalizedTutorScore = hasReviewSignals ? normalizedTutorRating : 0.5;
  const normalizedRepeatBookingScore = hasBookingSignals ? normalizedRepeatBookings : 0.5;
  const normalizedBookingFrequencyScore = hasBookingSignals ? normalizedBookingFrequency : 0.5;

  const metricEntries = [
    {
      normalized: normalizedSubjectScore,
      weight: weights.subjectRating,
      enabled: true,
    },
    {
      normalized: normalizedTutorScore,
      weight: weights.tutorRating,
      enabled: true,
    },
    {
      normalized: normalizedAvailabilities,
      weight: weights.availabilities,
      enabled: true,
    },
    {
      normalized: normalizedRepeatBookingScore,
      weight: weights.repeatBookings,
      enabled: true,
    },
    {
      normalized: normalizedBookingFrequencyScore,
      weight: weights.bookingFrequency,
      enabled: true,
    },
  ];

  const activeWeight = metricEntries
    .filter((entry) => entry.enabled)
    .reduce((sum, entry) => sum + entry.weight, 0);

  if (activeWeight <= 0) {
    return 0;
  }

  // Redistribute weights across available metrics so missing history does not penalize.
  const score = metricEntries.reduce((sum, entry) => {
    if (!entry.enabled) return sum;
    const effectiveWeight = (entry.weight / activeWeight) * 100;
    return sum + (entry.normalized * effectiveWeight);
  }, 0);

  return score;
}

/**
 * Sort offerings by weighted score
 * 
 * @param offerings - Array of offerings to sort
 * @param weights - The weights to apply (defaults to DEFAULT_WEIGHTS)
 * @returns Sorted array (highest score first)
 */
export function sortOfferingsByScore<T extends Offering>(
  offerings: T[],
  weights: SortingWeights = DEFAULT_WEIGHTS,
  options: ScoringOptions = {}
): T[] {
  const scoredOfferings = getOfferingsWithScores(offerings, weights, options);

  scoredOfferings.sort((a, b) => {
    // Sort by score (highest match first)
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Tiebreaker: subject name alphabetically
    return a.offering.subject.localeCompare(b.offering.subject);
  });

  return scoredOfferings.map((entry) => entry.offering);
}

/**
 * Compute stable weighted scores for offerings using one shared normalization context.
 * Use this when UI needs to display a score consistent with sort order.
 */
export function getOfferingsWithScores<T extends Offering>(
  offerings: T[],
  weights: SortingWeights = DEFAULT_WEIGHTS,
  options: ScoringOptions = {}
): Array<{ offering: T; score: number }> {
  const normalizationContext = buildNormalizationContext(offerings, options);
  const scoringOptions: ScoringOptions = {
    ...options,
    normalizationContext,
  };

  const safeScore = (offering: T): number => {
    const score = calculateOfferingScore(offering, weights, scoringOptions);
    return Number.isFinite(score) ? score : Number.NEGATIVE_INFINITY;
  };

  return offerings.map((offering) => ({
    offering,
    score: safeScore(offering),
  }));
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
  const context = options.normalizationContext;
  const hasAvailabilityContext = context?.hasAvailabilityContext ?? hasTuteeAvailability(options.tuteeAvailability);
  const metricValues = getOfferingMetricValues(offering, options);
  const hasReviewSignals = metricValues.reviewCount > 0;
  const hasBookingSignals = metricValues.bookingFrequency > 0;

  const effectiveSubjectRating = hasReviewSignals
    ? metricValues.subjectRating
    : NEUTRAL_DEFAULTS.subjectRating;
  const effectiveTutorRating = hasReviewSignals
    ? metricValues.tutorRating
    : NEUTRAL_DEFAULTS.tutorRating;
  const effectiveRepeatBookings = hasBookingSignals
    ? metricValues.repeatBookings
    : NEUTRAL_DEFAULTS.repeatBookings;
  const effectiveBookingFrequency = hasBookingSignals
    ? metricValues.bookingFrequency
    : NEUTRAL_DEFAULTS.bookingFrequency;

  const normalizedAvailabilityOverlap = normalizeWithContext(
    metricValues.availabilityOverlapMinutes,
    context?.availabilityOverlapRange ?? null,
    NORMALIZATION_TARGETS.availabilityOverlapMinutes,
    false
  );
  const normalizedAvailabilityDiversity = normalizeWithContext(
    metricValues.availabilityDiversity,
    context?.availabilityDiversityRange ?? null,
    NORMALIZATION_TARGETS.availabilities,
    false
  );
  const normalizedAvailabilityScore = hasAvailabilityContext
    ? (
        metricValues.availabilityOverlapMinutes > 0
          ? (
              normalizedAvailabilityOverlap * AVAILABILITY_BLEND.overlap +
              normalizedAvailabilityDiversity * AVAILABILITY_BLEND.diversity
            )
          : 0
      )
    : normalizedAvailabilityDiversity;

  const normalizedSubjectScore = hasReviewSignals
    ? normalizeWithContext(
        effectiveSubjectRating,
        context?.subjectRatingRange ?? null,
        NORMALIZATION_TARGETS.subjectRating,
        false
      )
    : 0.5;
  const normalizedTutorScore = hasReviewSignals
    ? normalizeWithContext(
        effectiveTutorRating,
        context?.tutorRatingRange ?? null,
        NORMALIZATION_TARGETS.tutorRating,
        false
      )
    : 0.5;
  const normalizedRepeatBookingsScore = hasBookingSignals
    ? normalizeWithContext(
        effectiveRepeatBookings,
        context?.repeatBookingsRange ?? null,
        NORMALIZATION_TARGETS.repeatBookings,
        true
      )
    : 0.5;
  const normalizedBookingFrequencyScore = hasBookingSignals
    ? normalizeWithContext(
        effectiveBookingFrequency,
        context?.bookingFrequencyRange ?? null,
        NORMALIZATION_TARGETS.bookingFrequency,
        true
      )
    : 0.5;

  const metricBreakdown = [
    {
      metric: 'Subject Rating',
      value: effectiveSubjectRating,
      normalized: normalizedSubjectScore,
      weight: weights.subjectRating,
      enabled: true,
    },
    {
      metric: 'Tutor Rating',
      value: effectiveTutorRating,
      normalized: normalizedTutorScore,
      weight: weights.tutorRating,
      enabled: true,
    },
    {
      metric: hasAvailabilityContext ? 'Availability Match (Blended)' : 'Availabilities',
      value: hasAvailabilityContext
        ? metricValues.availabilityOverlapMinutes
        : metricValues.availabilityDiversity,
      normalized: normalizedAvailabilityScore,
      weight: weights.availabilities,
      enabled: true,
    },
    {
      metric: 'Repeat Bookings',
      value: effectiveRepeatBookings,
      normalized: normalizedRepeatBookingsScore,
      weight: weights.repeatBookings,
      enabled: true,
    },
    {
      metric: 'Booking Frequency',
      value: effectiveBookingFrequency,
      normalized: normalizedBookingFrequencyScore,
      weight: weights.bookingFrequency,
      enabled: true,
    },
  ];

  const activeWeight = metricBreakdown
    .filter((metric) => metric.enabled)
    .reduce((sum, metric) => sum + metric.weight, 0);

  const breakdown = metricBreakdown.map(m => ({
    metric: m.metric,
    value: m.value,
    normalized: m.normalized,
    weight: m.enabled && activeWeight > 0 ? (m.weight / activeWeight) * 100 : 0,
    contribution: m.enabled && activeWeight > 0
      ? m.normalized * ((m.weight / activeWeight) * 100)
      : 0,
  }));

  const totalScore = breakdown.reduce((sum, item) => sum + item.contribution, 0);

  return { totalScore, breakdown };
}
