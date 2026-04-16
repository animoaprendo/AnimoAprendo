/**
 * Example Usage of Weighted Subject Sorting
 * 
 * This file demonstrates various ways to use the weighted sorting algorithm
 */

import { 
  sortOfferingsByScore, 
  calculateOfferingScore,
  getScoreBreakdown,
  DEFAULT_WEIGHTS,
  WEIGHT_PRESETS,
  type SortingWeights,
  type Offering
} from '@/lib/subject-sorting';

// ============================================================================
// EXAMPLE 1: Basic Sorting with Default Weights
// ============================================================================

export function basicSortExample(offerings: Offering[]) {
  // Simply sort with default weights
  const sorted = sortOfferingsByScore(offerings);
  
  console.log('Top 5 offerings:', sorted.slice(0, 5).map(o => ({
    subject: o.subject,
    score: calculateOfferingScore(o)
  })));
  
  return sorted;
}

// ============================================================================
// EXAMPLE 2: Using Custom Weights
// ============================================================================

export function customWeightsExample(offerings: Offering[]) {
  // Create custom weights that prioritize availability
  const customWeights: SortingWeights = {
    subjectRating: 25,
    tutorRating: 25,
    availabilities: 30,  // Higher priority on availability
    repeatBookings: 10,
    bookingFrequency: 10,
    yearLevelProximity: 0,
  };
  
  const sorted = sortOfferingsByScore(offerings, customWeights);
  return sorted;
}

// ============================================================================
// EXAMPLE 3: Using Built-in Presets
// ============================================================================

export function presetsExample(offerings: Offering[]) {
  // Use a preset for quality-focused sorting
  const qualityFocused = sortOfferingsByScore(
    offerings, 
    WEIGHT_PRESETS.QUALITY_FOCUSED
  );
  
  // Use a preset for availability-focused sorting
  const availabilityFocused = sortOfferingsByScore(
    offerings, 
    WEIGHT_PRESETS.AVAILABILITY_FOCUSED
  );
  
  return {
    quality: qualityFocused.slice(0, 10),
    availability: availabilityFocused.slice(0, 10)
  };
}

// ============================================================================
// EXAMPLE 4: Debugging - Understanding Scores
// ============================================================================

export function debugScoreExample(offering: Offering) {
  const breakdown = getScoreBreakdown(offering);
  
  console.log(`\n=== Score Breakdown for ${offering.subject} ===`);
  console.log(`Total Score: ${breakdown.totalScore.toFixed(2)}\n`);
  
  breakdown.breakdown.forEach(item => {
    console.log(`${item.metric}:`);
    console.log(`  Value: ${item.value}`);
    console.log(`  Normalized: ${item.normalized.toFixed(2)}`);
    console.log(`  Weight: ${item.weight}%`);
    console.log(`  Contribution: ${item.contribution.toFixed(2)}\n`);
  });
  
  return breakdown;
}

// ============================================================================
// EXAMPLE 5: Filtering + Sorting
// ============================================================================

export function filterAndSortExample(offerings: Offering[]) {
  // First filter offerings (e.g., by subject, rating, availability)
  const filtered = offerings.filter(offering => {
    return (
      (offering.averageRating || 0) >= 3.5 &&  // At least 3.5 stars
      (offering.availabilityCount || 0) >= 2    // Available at least 2 days
    );
  });
  
  // Then sort the filtered results
  const sorted = sortOfferingsByScore(filtered);
  
  return sorted;
}

// ============================================================================
// EXAMPLE 6: User Preference Based Sorting
// ============================================================================

export function userPreferenceExample(
  offerings: Offering[], 
  userPreferences: {
    prefersHighRating?: boolean;
    prefersAvailability?: boolean;
    prefersPopular?: boolean;
  }
) {
  let weights = { ...DEFAULT_WEIGHTS };
  
  // Adjust weights based on user preferences
  if (userPreferences.prefersHighRating) {
    weights.subjectRating = 50;
    weights.tutorRating = 35;
    weights.availabilities = 10;
    weights.repeatBookings = 3;
    weights.bookingFrequency = 2;
  } else if (userPreferences.prefersAvailability) {
    weights = WEIGHT_PRESETS.AVAILABILITY_FOCUSED;
  } else if (userPreferences.prefersPopular) {
    weights = WEIGHT_PRESETS.POPULARITY_FOCUSED;
  }
  
  return sortOfferingsByScore(offerings, weights);
}

// ============================================================================
// EXAMPLE 7: A/B Testing Different Weight Strategies
// ============================================================================

export function abTestExample(offerings: Offering[], userId: string) {
  // Simple hash-based A/B test
  const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = userHash % 3; // 3 variants
  
  let weights: SortingWeights;
  let variantName: string;
  
  switch (variant) {
    case 0:
      weights = DEFAULT_WEIGHTS;
      variantName = 'Balanced';
      break;
    case 1:
      weights = WEIGHT_PRESETS.QUALITY_FOCUSED;
      variantName = 'Quality';
      break;
    case 2:
      weights = WEIGHT_PRESETS.AVAILABILITY_FOCUSED;
      variantName = 'Availability';
      break;
    default:
      weights = DEFAULT_WEIGHTS;
      variantName = 'Balanced';
  }
  
  console.log(`User ${userId} assigned to variant: ${variantName}`);
  
  return {
    sorted: sortOfferingsByScore(offerings, weights),
    variant: variantName
  };
}

// ============================================================================
// EXAMPLE 8: Comparative Analysis
// ============================================================================

export function compareStrategiesExample(offerings: Offering[]) {
  // Get top 10 from each strategy
  const strategies = {
    balanced: sortOfferingsByScore(offerings, DEFAULT_WEIGHTS),
    quality: sortOfferingsByScore(offerings, WEIGHT_PRESETS.QUALITY_FOCUSED),
    availability: sortOfferingsByScore(offerings, WEIGHT_PRESETS.AVAILABILITY_FOCUSED),
    popularity: sortOfferingsByScore(offerings, WEIGHT_PRESETS.POPULARITY_FOCUSED)
  };
  
  // Get top 10 from each
  const top10 = {
    balanced: strategies.balanced.slice(0, 10),
    quality: strategies.quality.slice(0, 10),
    availability: strategies.availability.slice(0, 10),
    popularity: strategies.popularity.slice(0, 10)
  };
  
  // Analyze overlap
  const balancedIds = new Set(top10.balanced.map(o => o._id));
  
  console.log('\n=== Strategy Comparison ===');
  console.log(`Quality overlap: ${top10.quality.filter(o => balancedIds.has(o._id)).length}/10`);
  console.log(`Availability overlap: ${top10.availability.filter(o => balancedIds.has(o._id)).length}/10`);
  console.log(`Popularity overlap: ${top10.popularity.filter(o => balancedIds.has(o._id)).length}/10`);
  
  return top10;
}

// ============================================================================
// EXAMPLE 9: Calculating Individual Scores
// ============================================================================

export function scoreCalculationExample(offering: Offering) {
  const defaultScore = calculateOfferingScore(offering, DEFAULT_WEIGHTS);
  const qualityScore = calculateOfferingScore(offering, WEIGHT_PRESETS.QUALITY_FOCUSED);
  const availScore = calculateOfferingScore(offering, WEIGHT_PRESETS.AVAILABILITY_FOCUSED);
  
  console.log(`\n=== Scores for ${offering.subject} ===`);
  console.log(`Default: ${defaultScore.toFixed(2)}`);
  console.log(`Quality-focused: ${qualityScore.toFixed(2)}`);
  console.log(`Availability-focused: ${availScore.toFixed(2)}`);
  
  return {
    default: defaultScore,
    quality: qualityScore,
    availability: availScore
  };
}

// ============================================================================
// EXAMPLE 10: Real-world Integration Example
// ============================================================================

export function realWorldIntegrationExample(
  offerings: Offering[],
  searchQuery?: string,
  minRating?: number,
  availableDay?: string,
  sortStrategy: 'weighted' | 'rating' | 'newest' = 'weighted'
) {
  // Step 1: Filter by search query
  let filtered = offerings;
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(o => 
      o.subject.toLowerCase().includes(query) ||
      o.description.toLowerCase().includes(query) ||
      o.user?.displayName.toLowerCase().includes(query)
    );
  }
  
  // Step 2: Filter by minimum rating
  if (minRating) {
    filtered = filtered.filter(o => (o.averageRating || 0) >= minRating);
  }
  
  // Step 3: Filter by availability
  if (availableDay) {
    filtered = filtered.filter(o =>
      o.availability?.some(a => 
        a.day.toLowerCase() === availableDay.toLowerCase()
      )
    );
  }
  
  // Step 4: Sort based on strategy
  switch (sortStrategy) {
    case 'weighted':
      return sortOfferingsByScore(filtered, DEFAULT_WEIGHTS);
    case 'rating':
      return filtered.sort((a, b) => 
        (b.averageRating || 0) - (a.averageRating || 0)
      );
    case 'newest':
      return filtered.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    default:
      return sortOfferingsByScore(filtered, DEFAULT_WEIGHTS);
  }
}
