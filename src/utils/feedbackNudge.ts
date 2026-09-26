// src/utils/feedbackNudge.ts
// When (and whether) to invite feedback after an export or print.

export const FEEDBACK_NUDGE_DELAY_MS = 3000;
export const FEEDBACK_NUDGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export const FEEDBACK_NUDGE_KEYS = {
  askedAt: 'sundial-feedback-asked-at',
  dismissedAt: 'sundial-feedback-dismissed-at',
  submittedAt: 'sundial-feedback-submitted-at',
  sessionShown: 'sundial-feedback-session-shown',
} as const;

function readTimestamp(storage: Storage, key: string): number {
  const raw = storage.getItem(key);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function hasSubmittedFeedback(): boolean {
  return readTimestamp(localStorage, FEEDBACK_NUDGE_KEYS.submittedAt) > 0;
}

export function shouldShowFeedbackNudge(now = Date.now()): boolean {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(FEEDBACK_NUDGE_KEYS.sessionShown) === '1') {
    return false;
  }
  if (hasSubmittedFeedback()) {
    return false;
  }
  const dismissedAt = readTimestamp(localStorage, FEEDBACK_NUDGE_KEYS.dismissedAt);
  if (dismissedAt > 0 && now - dismissedAt < FEEDBACK_NUDGE_COOLDOWN_MS) {
    return false;
  }
  return true;
}

export function markFeedbackNudgeShown(now = Date.now()): void {
  sessionStorage.setItem(FEEDBACK_NUDGE_KEYS.sessionShown, '1');
  localStorage.setItem(FEEDBACK_NUDGE_KEYS.askedAt, String(now));
}

export function markFeedbackNudgeDismissed(now = Date.now()): void {
  localStorage.setItem(FEEDBACK_NUDGE_KEYS.dismissedAt, String(now));
}

export function markFeedbackNudgeSubmitted(now = Date.now()): void {
  localStorage.setItem(FEEDBACK_NUDGE_KEYS.submittedAt, String(now));
}

/**
 * Reserve the once-per-session slot immediately, then call onShow after a short
 * delay so the prompt does not fight the download or print dialog.
 * Returns the timeout id, or null if the nudge should not appear.
 */
export function startFeedbackNudge(
  onShow: () => void,
  delayMs = FEEDBACK_NUDGE_DELAY_MS,
  now = Date.now(),
): ReturnType<typeof setTimeout> | null {
  if (!shouldShowFeedbackNudge(now)) {
    return null;
  }
  markFeedbackNudgeShown(now);
  return setTimeout(onShow, delayMs);
}
