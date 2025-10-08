// Quiz Button State Documentation
// This file documents the new quiz button behavior after completing quizzes

/**
 * Quiz Button States for Tutees:
 * 
 * BEFORE TAKING ANY QUIZ:
 * - Primary Button: "Take Pre-Session Quiz" (white background)
 * - Status Indicator: "○ Pre-Session Quiz" (gray)
 * - Post-Session Button: Not visible (session not completed)
 * 
 * AFTER COMPLETING PRE-SESSION QUIZ:
 * - Primary Button: "View Pre-Session Quiz" (green background)
 * - Status Indicator: "✓ Pre-Session Quiz" (green)
 * - Post-Session Button: Not visible (session not completed)
 * 
 * AFTER SESSION IS MARKED COMPLETED (but post-quiz not taken):
 * - Primary Button: "View Pre-Session Quiz" (green background)
 * - Status Indicator: "✓ Pre-Session Quiz" (green)
 * - Post-Session Button: "Take Post-Session Quiz" (purple background)
 * - Post Status Indicator: "○ Post-Session Quiz" (orange)
 * 
 * AFTER COMPLETING BOTH QUIZZES:
 * - Primary Button: "View Pre-Session Quiz" (green background)
 * - Status Indicator: "✓ Pre-Session Quiz" (green)
 * - Post-Session Button: "View Post-Session Quiz" (green background)
 * - Post Status Indicator: "✓ Post-Session Quiz" (green)
 */

// Example of the quiz completion check logic:
const checkQuizCompletion = (appointment, userId) => {
  const quizAttempts = appointment.quizAttempts || [];
  const hasCompletedAttempt1 = quizAttempts.some(
    attempt => attempt.attempt === 1 && attempt.tuteeId === userId
  );
  const hasCompletedAttempt2 = quizAttempts.some(
    attempt => attempt.attempt === 2 && attempt.tuteeId === userId
  );
  
  return { hasCompletedAttempt1, hasCompletedAttempt2 };
};