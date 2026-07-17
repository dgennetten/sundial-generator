// src/components/gallery/imageResize.ts
//
// Downscale/re-encode a chosen photo in the browser before uploading. Phone
// cameras produce 5–12 MB full-resolution files; sending those raw over a
// mobile connection takes long enough that the browser or network drops the
// request ("Failed to fetch"). Shrinking to ~2000px JPEG makes the payload a
// few hundred KB, so the upload completes in a second or two.
//
// The server also downscales to the same bound, so this only moves that work
// earlier and shrinks the transfer — the visible result is identical.

const MAX_DIM = 2000; // longest edge, px — matches GALLERY_MAX_DIMENSION server-side
const JPEG_QUALITY = 0.85;
// Files below this that are already within MAX_DIM upload fine as-is; skip the
// re-encode so we don't needlessly convert small PNGs to JPEG.
const SKIP_BELOW_BYTES = 1_000_000;

/**
 * Returns a possibly-smaller File ready for upload. On any failure (unsupported
 * type, decode error, no canvas) it returns the original file unchanged, so the
 * upload still proceeds — worst case it's just the old slow path.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // Only raster types the canvas can decode. HEIC and friends fall through
  // untouched (and are rejected earlier by the type check anyway).
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  if (typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies EXIF orientation so portrait phone photos don't
    // come out sideways once the EXIF is dropped by re-encoding.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const needsResize = longest > MAX_DIM;

    if (!needsResize && file.size < SKIP_BELOW_BYTES) {
      return file;
    }

    const scale = needsResize ? MAX_DIM / longest : 1;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return file;

    // If re-encoding didn't actually help (already-optimized small JPEG), keep
    // the original rather than upload something larger.
    if (blob.size >= file.size && !needsResize) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
