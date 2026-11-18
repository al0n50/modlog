/**
 * Getting a car photo ready to upload. Phone photos are often 3–12 MB and 4000+ px wide; they're
 * shrunk on the device to at most 2000 px (JPEG) before upload, so they fit the 5 MB limit and
 * load fast. Tested in tests/photos.test.js.
 */

// Must match the bucket's limits in supabase/migrations (the server enforces them too)
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_EDGE = 2000

// A friendly reason a file can't be uploaded, or null if it's fine
export function photoError(file) {
  if (!PHOTO_TYPES.includes(file.type)) return `${file.name}: use a JPG, PNG, WebP, or HEIC photo.`
  if (file.size > MAX_PHOTO_BYTES) return `${file.name}: photos must be 5 MB or smaller.`
  return null
}

// The size that fits inside max × max without stretching; never enlarges
export function fitWithin(width, height, max = MAX_EDGE) {
  if (!(width > 0 && height > 0)) return null
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// File extension for an image type (the stored file name doesn't trust the original name)
export function extensionFor(type) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }[type] ?? 'jpg'
}

/**
 * Shrink a photo before upload. Returns a smaller JPEG when the browser can read the image, or
 * the original file when it can't (e.g. HEIC outside Safari) or shrinking wouldn't help.
 */
export async function preparePhoto(file, { maxEdge = MAX_EDGE, quality = 0.85 } = {}) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  try {
    const size = fitWithin(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    const ctx = size && canvas.getContext('2d')
    if (!ctx) return file
    canvas.width = size.width
    canvas.height = size.height
    ctx.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    // Keep the original if it's already fine and the copy wouldn't be smaller
    if (blob.size >= file.size && !photoError(file)) return file
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close?.()
  }
}
