// src/types/gallery.ts

export type GalleryPhotoStatus = 'pending' | 'approved' | 'rejected';

export interface GalleryPhoto {
  id: number;
  caption: string | null;
  /** Server-relative path, e.g. /gallery-uploads/ab12….jpg */
  image_src: string;
  width: number | null;
  height: number | null;
  status: GalleryPhotoStatus;
  created_at: string;
  /** True when the signed-in caller may delete this photo (owner or moderator). */
  can_delete?: boolean;
}

export interface GalleryUser {
  id: number;
  email: string;
  token: string;
}
