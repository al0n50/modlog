import { supabase } from './supabase'

const BUCKET = 'vehicle-photos'

// Must match the bucket's limits in supabase/migrations (the server enforces them too)
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// A friendly reason a file can't be uploaded, or null if it's fine
export function photoError(file) {
  if (!PHOTO_TYPES.includes(file.type)) return `${file.name}: use a JPG, PNG, WebP, or HEIC photo.`
  if (file.size > MAX_PHOTO_BYTES) return `${file.name}: photos must be 5 MB or smaller.`
  return null
}

// Upload a file and return its public URL
export async function uploadVehiclePhoto(userId, vehicleId, file) {
  const bad = photoError(file)
  if (bad) throw new Error(bad)
  const ext      = file.name.split('.').pop()
  const filename = `${Date.now()}.${ext}`
  const path     = `${userId}/${vehicleId}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Delete a photo by its full URL
export async function deleteVehiclePhoto(url) {
  // Extract path from public URL
  const path = url.split(`${BUCKET}/`)[1]
  if (!path) throw new Error('Invalid photo URL')

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (error) throw error
}

// List all photos for a vehicle
export async function listVehiclePhotos(userId, vehicleId) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${vehicleId}`, {
      sortBy: { column: 'created_at', order: 'asc' }
    })

  if (error) throw error
  return (data || []).map(f => ({
    name: f.name,
    url:  supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${vehicleId}/${f.name}`).data.publicUrl
  }))
}