import { extensionFor, photoError, preparePhoto } from './photos'
import { supabase } from './supabase'

const BUCKET = 'vehicle-photos'

export { MAX_PHOTO_BYTES, PHOTO_TYPES, photoError } from './photos'

// Shrink the photo on the device, upload it to the owner's folder, and return its public URL
export async function uploadVehiclePhoto(userId, vehicleId, original) {
  const file = await preparePhoto(original)
  const bad  = photoError(file)
  if (bad) throw new Error(bad)
  const path = `${userId}/${vehicleId}/${Date.now()}.${extensionFor(file.type)}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

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

// Remove every photo of a car (used before deleting the car; the database can't delete files)
export async function deleteAllVehiclePhotos(userId, vehicleId) {
  const folder = `${userId}/${vehicleId}`
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })
  if (error) throw error
  const paths = (data || []).map(f => `${folder}/${f.name}`)
  if (paths.length) {
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(paths)
    if (rmError) throw rmError
  }
  return paths.length
}
