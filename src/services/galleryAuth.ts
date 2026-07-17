// src/services/galleryAuth.ts
import type { GalleryUser } from '../types/gallery';
import { galleryUrl } from './galleryApi';

export const GALLERY_SESSION_KEY  = 'sundial-gallery-session';
export const GALLERY_TOKEN_KEY    = 'sundial-gallery-token';
export const GALLERY_EXPIRES_KEY  = 'sundial-gallery-expires';
export const GALLERY_REMEMBER_KEY = 'sundial-gallery-remember';

export interface GalleryAuthResponse {
  success: boolean;
  id: number;
  email: string;
  token: string;
  expiresAt?: number;
  error?: string;
}

export function getStoredGalleryToken(): string | null {
  try {
    return localStorage.getItem(GALLERY_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearGallerySession(): void {
  try {
    localStorage.removeItem(GALLERY_SESSION_KEY);
    localStorage.removeItem(GALLERY_TOKEN_KEY);
    localStorage.removeItem(GALLERY_EXPIRES_KEY);
    localStorage.removeItem(GALLERY_REMEMBER_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function saveGallerySession(user: GalleryUser, remember: boolean, expiresAtMs?: number): void {
  const days = remember ? 365 : 1;
  const expiresAt =
    expiresAtMs != null && Number.isFinite(expiresAtMs)
      ? expiresAtMs
      : Date.now() + days * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(GALLERY_SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(GALLERY_TOKEN_KEY, user.token);
    localStorage.setItem(GALLERY_EXPIRES_KEY, String(expiresAt));
    localStorage.setItem(GALLERY_REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

/** Reads a non-expired session from localStorage, if one is there. */
export function loadGallerySession(): GalleryUser | undefined {
  try {
    const expires = localStorage.getItem(GALLERY_EXPIRES_KEY);
    if (expires && Date.now() > Number(expires)) {
      clearGallerySession();
      return undefined;
    }
    const raw = localStorage.getItem(GALLERY_SESSION_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const id = Math.trunc(Number(parsed.id));
    const token = typeof parsed.token === 'string' ? parsed.token : '';
    if (!Number.isFinite(id) || id < 1 || !token) return undefined;

    return { id, email: String(parsed.email ?? ''), token };
  } catch {
    return undefined;
  }
}

export async function requestGalleryOtp(email: string): Promise<void> {
  const res = await fetch(galleryUrl('/gallery-request-otp.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Request failed');
}

export async function verifyGalleryOtp(
  email: string,
  code: string,
  remember: boolean,
): Promise<GalleryAuthResponse> {
  const res = await fetch(galleryUrl('/gallery-verify-otp.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, remember }),
  });
  const data = (await res.json()) as GalleryAuthResponse;
  if (!data.success) throw new Error(data.error ?? 'Verification failed');
  return data;
}

export async function validateStoredGallerySession(token: string): Promise<GalleryAuthResponse | null> {
  try {
    const res = await fetch(galleryUrl('/gallery-session.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json()) as GalleryAuthResponse;
    return data.success ? data : null;
  } catch {
    return null;
  }
}
