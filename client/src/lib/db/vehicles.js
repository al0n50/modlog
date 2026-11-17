// Cars: the garage, a single build, public feeds, and the 3D model for a car.
import { supabase } from '../supabase'
import { VEHICLE_SELECT, normalizeVehicle } from '../vehicles'
import { deleteAllVehiclePhotos } from '../storage'
import { DataError, run, toDataError } from './errors'

export const PAGE_SIZE = 20

// A build-summary row → the shape list cards use
export function toCard(row) {
  return {
    ...row,
    mods:      row.recent_mods || [],      // latest done mods (up to 4)
    mod_count: row.done_count ?? 0,
    profiles:  { username: row.username, display_name: row.display_name, avatar_url: row.avatar_url },
  }
}

export async function listMyVehicles(userId) {
  const rows = await run(supabase.from('vehicles').select(VEHICLE_SELECT)
    .eq('user_id', userId).order('created_at', { ascending: false }))
  return (rows || []).map(normalizeVehicle)
}

export async function getVehicle(vehicleId) {
  const row = await run(supabase.from('vehicles').select(VEHICLE_SELECT).eq('id', vehicleId).maybeSingle())
  if (!row) throw new DataError('This build doesn\'t exist or is private.', { code: 'not_found' })
  return normalizeVehicle(row)
}

export async function createVehicle(fields, userId) {
  const row = await run(supabase.from('vehicles').insert({ ...fields, user_id: userId })
    .select(VEHICLE_SELECT).single())
  return normalizeVehicle(row)
}

export async function updateVehicle(vehicleId, patch) {
  return run(supabase.from('vehicles').update(patch).eq('id', vehicleId).select('*').single())
}

// Deletes the car's photos first (the database can't remove files), then the car,
// which removes its mods and timeline with it.
export async function deleteVehicle(vehicle) {
  try {
    await deleteAllVehiclePhotos(vehicle.user_id, vehicle.id)
  } catch (e) {
    throw toDataError(e)
  }
  await run(supabase.from('vehicles').delete().eq('id', vehicle.id))
}

// Public builds, newest first, a page at a time
export async function listPublicBuilds({ page = 0, pageSize = PAGE_SIZE } = {}) {
  const from = page * pageSize
  const rows = await run(supabase.from('vehicle_summaries').select('*')
    .eq('is_public', true).order('created_at', { ascending: false })
    .range(from, from + pageSize))          // one extra row tells us if there's another page
  const items = (rows || []).slice(0, pageSize).map(toCard)
  return { items, hasMore: (rows || []).length > pageSize }
}

// A user's public profile and their public builds
export async function getPublicGarage(username) {
  const profile = await run(supabase.from('profiles')
    .select('id, username, display_name, avatar_url, bio, created_at').eq('username', username).maybeSingle())
  if (!profile) throw new DataError('User not found.', { code: 'not_found' })
  const rows = await run(supabase.from('vehicle_summaries').select('*')
    .eq('user_id', profile.id).eq('is_public', true).order('created_at', { ascending: false }))
  return { profile, vehicles: (rows || []).map(toCard) }
}

// Which 3D model to show for a car (exact model if we have one, else its body style)
export async function getCarModel(vehicleId) {
  const rows = await run(supabase.rpc('car_model_for', { v_id: vehicleId }))
  return rows?.[0] ?? null
}
