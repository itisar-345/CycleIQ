/**
 * Safeguarding configuration — REQUIRES CLINICAL REVIEW before public release.
 *
 * See docs/CLINICAL_REVIEW.md for sign-off checklist.
 * Do not change thresholds without updating that document and obtaining review.
 */
export const SAFEGUARDING_CLINICAL_REVIEW_REQUIRED = true;

/** Consecutive log days with mood_score === 1 before in-app prompt. */
export const SAFEGUARDING_LOW_MOOD_THRESHOLD_DAYS = 3;

/** Minimum mood score (1–5) that counts as "low" for safeguarding. */
export const SAFEGUARDING_LOW_MOOD_SCORE = 1;

/** Days before the same safeguarding prompt may appear again. */
export const SAFEGUARDING_PROMPT_COOLDOWN_DAYS = 14;

/** Route shown when user taps "View Resources" on safeguarding alert. */
export const SAFEGUARDING_RESOURCES_ROUTE = "/education/resources";
