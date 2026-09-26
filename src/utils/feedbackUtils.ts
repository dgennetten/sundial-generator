import { log } from './logger';

export type FeedbackSource = 'export-nudge' | 'about' | 'followup';
export type FeedbackRating = 'worked' | 'problem';
export type FeedbackEvent =
  | 'nudge_shown'
  | 'nudge_rated'
  | 'nudge_commented'
  | 'followup_opted_in';

export interface FeedbackPayload {
  message?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  source?: FeedbackSource;
  rating?: FeedbackRating;
  email?: string;
  format?: string;
  event?: FeedbackEvent;
  followUp?: boolean;
}

function feedbackApiUrl(path: string): string {
  return import.meta.env.DEV ? `https://precisionsundial.com${path}` : path;
}

async function postFeedbackJson(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(feedbackApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result: { success?: boolean; error?: string } = {};
    try {
      result = JSON.parse(text);
    } catch {
      log.warn('Feedback response was not JSON:', text.substring(0, 200));
      return { success: false, error: 'Unexpected server response.' };
    }

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'Failed to send feedback.' };
    }

    return { success: true };
  } catch (err) {
    log.warn('Feedback request failed:', err);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function sendFeedback(payload: FeedbackPayload): Promise<{ success: boolean; error?: string }> {
  const result = await postFeedbackJson('/feedback.php', {
    message: payload.message ?? '',
    latitude: payload.latitude ?? 0,
    longitude: payload.longitude ?? 0,
    locationName: payload.locationName ?? '',
    source: payload.source,
    rating: payload.rating,
    email: payload.email ?? '',
    format: payload.format ?? '',
    event: payload.event,
    followUp: Boolean(payload.followUp),
  });

  if (result.success && payload.followUp && payload.email?.trim()) {
    const optedIn = await requestFeedbackFollowUp(payload);
    if (optedIn.success) {
      void logFeedbackEvent({
        event: 'followup_opted_in',
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationName: payload.locationName,
        format: payload.format,
        email: payload.email,
      });
    }
  }

  return result;
}

export async function requestFeedbackFollowUp(
  payload: FeedbackPayload,
): Promise<{ success: boolean; error?: string }> {
  const email = payload.email?.trim() ?? '';
  if (!email) {
    return { success: false, error: 'Email is required for a follow-up.' };
  }

  return postFeedbackJson('/feedback-optin.php', {
    email,
    latitude: payload.latitude ?? 0,
    longitude: payload.longitude ?? 0,
    locationName: payload.locationName ?? '',
    rating: payload.rating ?? '',
    comment: payload.message ?? '',
    format: payload.format ?? '',
  });
}

export function logFeedbackEvent(payload: FeedbackPayload & { event: FeedbackEvent }): void {
  void postFeedbackJson('/feedback.php', {
    event: payload.event,
    latitude: payload.latitude ?? 0,
    longitude: payload.longitude ?? 0,
    locationName: payload.locationName ?? '',
    format: payload.format ?? '',
    email: payload.email ?? '',
    rating: payload.rating ?? '',
    source: payload.source ?? 'export-nudge',
  });
}
