// src/components/gallery/useGalleryAuth.ts
import { useCallback, useEffect, useState } from 'react';
import type { GalleryUser } from '../../types/gallery';
import {
  clearGallerySession,
  getStoredGalleryToken,
  loadGallerySession,
  saveGallerySession,
  validateStoredGallerySession,
  GALLERY_REMEMBER_KEY,
} from '../../services/galleryAuth';

export interface GalleryAuth {
  user: GalleryUser | undefined;
  signIn: (user: GalleryUser, remember: boolean, expiresAtMs?: number) => void;
  signOut: () => void;
}

/**
 * Gallery sign-in state, persisted to localStorage. On mount, a remembered
 * token is revalidated against the server so a revoked or expired session
 * doesn't linger in the UI.
 */
export function useGalleryAuth(): GalleryAuth {
  const [user, setUser] = useState<GalleryUser | undefined>(loadGallerySession);

  const signIn = useCallback((next: GalleryUser, remember: boolean, expiresAtMs?: number) => {
    saveGallerySession(next, remember, expiresAtMs);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    clearGallerySession();
    setUser(undefined);
  }, []);

  useEffect(() => {
    // A session already restored from storage is good enough; only revalidate
    // when we have a remembered token but no usable session object.
    if (user) return;

    let cancelled = false;
    const token = getStoredGalleryToken();
    if (!token || localStorage.getItem(GALLERY_REMEMBER_KEY) !== '1') return;

    void (async () => {
      const result = await validateStoredGallerySession(token);
      if (cancelled) return;
      if (result?.success && result.id >= 1 && result.token) {
        signIn({ id: result.id, email: result.email, token: result.token }, true, result.expiresAt);
      } else {
        clearGallerySession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once on mount; `user` is intentionally read only for the initial check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, signIn, signOut };
}
