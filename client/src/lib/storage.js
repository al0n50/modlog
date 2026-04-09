import { supabase } from './supabase'

const BUCKET = 'vehicle-photos'

// Upload a file and return its public URL
export async function uploadVehiclePhoto(userId, vehicleId, file) {
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