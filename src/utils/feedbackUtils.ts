import { log } from './logger';

export interface FeedbackPayload {
  message: string;
  latitude: number;
  longitude: number;
  locationName: string;
}

export async function sendFeedback(payload: FeedbackPayload): Promise<{ success: boolean; error?: string }> {
  const isDevelopment = import.meta.env.DEV;
  const feedbackUrl = isDevelopment
    ? 'https://precisionsundial.com/feedback.php'
    : '/feedback.php';

  try {
    const response = await fetch(feedbackUrl, {
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
