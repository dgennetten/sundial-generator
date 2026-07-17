// src/services/galleryApi.ts
import type { GalleryPhoto } from '../types/gallery';

/**
 * The PHP endpoints only exist on the production host, so localhost talks to
 * precisionsundial.com directly — same convention as sundialPrintUtils.ts.
 */
export const GALLERY_ORIGIN =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://precisionsundial.com'
    : '';

export const galleryUrl = (path: string): string => `${GALLERY_ORIGIN}${path}`;

/** Resolves a server-relative image path against the API origin. */
export const galleryImageUrl = (imageSrc: string): string =>
  imageSrc.startsWith('http') ? imageSrc : `${GALLERY_ORIGIN}${imageSrc}`;

interface PhotosResponse {
  photos?: GalleryPhoto[];
  error?: string;
}

/** Approved photos, plus the caller's own pending ones when a token is passed. */
export async function fetchGalleryPhotos(token?: string | null): Promise<GalleryPhoto[]> {
  const res = await fetch(galleryUrl('/gallery-photos.php'), {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as PhotosResponse;
  return data.photos ?? [];
}

interface UploadResponse {
  success?: boolean;
  photo?: GalleryPhoto;
  error?: string;
}

/** Thrown when the request never reached the server (network drop, timeout). */
export class GalleryNetworkError extends Error {
  constructor() {
    super('network');
    this.name = 'GalleryNetworkError';
  }
}

const UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadGalleryPhoto(
  file: File,
  caption: string,
  token: string,
): Promise<GalleryPhoto> {
  const form = new FormData();
  form.append('image', file);
  form.append('caption', caption);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(galleryUrl('/gallery-upload.php'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
  } catch {
    // AbortError (timeout) and TypeError ("Failed to fetch") both mean the
    // upload didn't complete — surface one clear, translatable message.
    throw new GalleryNetworkError();
  } finally {
    clearTimeout(timer);
  }

  let data: UploadResponse;
  try {
    data = (await res.json()) as UploadResponse;
  } catch {
    throw new Error('Upload failed. Please try again.');
  }
  if (!res.ok || !data.success || !data.photo) {
    throw new Error(data.error ?? 'Upload failed. Please try again.');
  }
  return data.photo;
}

interface DeleteResponse {
  success?: boolean;
  deleted?: number;
  error?: string;
}

export async function deleteGalleryPhoto(id: number, token: string): Promise<void> {
  const res = await fetch(galleryUrl('/gallery-delete.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id }),
  });

  let data: DeleteResponse;
  try {
    data = (await res.json()) as DeleteResponse;
  } catch {
    throw new Error('Delete failed. Please try again.');
  }
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? 'Delete failed. Please try again.');
  }
}
