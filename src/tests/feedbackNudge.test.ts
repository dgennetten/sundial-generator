import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FEEDBACK_NUDGE_COOLDOWN_MS,
  FEEDBACK_NUDGE_DELAY_MS,
  FEEDBACK_NUDGE_KEYS,
  hasSubmittedFeedback,
  markFeedbackNudgeDismissed,
  markFeedbackNudgeShown,
  markFeedbackNudgeSubmitted,
  shouldShowFeedbackNudge,
  startFeedbackNudge,
} from '../utils/feedbackNudge';

describe('feedbackNudge', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows on the first success when nothing has been stored', () => {
    expect(shouldShowFeedbackNudge()).toBe(true);
  });

  it('does not show again in the same session after it has been shown', () => {
    markFeedbackNudgeShown(1_000);
    expect(sessionStorage.getItem(FEEDBACK_NUDGE_KEYS.sessionShown)).toBe('1');
    expect(shouldShowFeedbackNudge(1_000)).toBe(false);
  });

  it('does not show after a rating or comment has been submitted', () => {
    markFeedbackNudgeSubmitted(1_000);
    expect(hasSubmittedFeedback()).toBe(true);
    expect(shouldShowFeedbackNudge(1_000)).toBe(false);
  });

  it('hides for 14 days after dismiss, then returns', () => {
    const dismissedAt = 1_700_000_000_000;
    markFeedbackNudgeDismissed(dismissedAt);
    expect(shouldShowFeedbackNudge(dismissedAt + FEEDBACK_NUDGE_COOLDOWN_MS - 1)).toBe(false);
    expect(shouldShowFeedbackNudge(dismissedAt + FEEDBACK_NUDGE_COOLDOWN_MS)).toBe(true);
  });

  it('schedules the show callback after the delay and reserves the session slot', () => {
    const onShow = vi.fn();
    const id = startFeedbackNudge(onShow, FEEDBACK_NUDGE_DELAY_MS, 5_000);
    expect(id).not.toBeNull();
    expect(onShow).not.toHaveBeenCalled();
    expect(shouldShowFeedbackNudge(5_000)).toBe(false);

    vi.advanceTimersByTime(FEEDBACK_NUDGE_DELAY_MS - 1);
    expect(onShow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('does not schedule when the user already submitted', () => {
    markFeedbackNudgeSubmitted(1);
    expect(startFeedbackNudge(vi.fn())).toBeNull();
  });
});
