// Mods: one table, status 'done' or 'planned'. The database writes the build timeline.
import { supabase } from '../supabase'
import { plannedModRow, toWishItem } from '../vehicles'
import { run } from './errors'

export async function addDoneMod(vehicleId, fields) {
  return run(supabase.from('mods').insert({ ...fields, vehicle_id: vehicleId, status: 'done' }).select().single())
}

// Returns the planned mod in the wishlist shape the UI uses
export async function addPlannedMod(vehicleId, item) {
  return toWishItem(await run(supabase.from('mods').insert(plannedModRow(vehicleId, item)).select().single()))
}

// A planned mod becomes done: same row, new status and install details
export async function markPlannedDone(modId, details) {
  return run(supabase.from('mods').update({
    status:       'done',
    name:         details.name,
    category:     details.category,
    brand:        details.brand        || null,
    price:        details.price        || null,
    install_date: details.install_date || null,
    notes:        details.notes        || null,
  }).eq('id', modId).eq('status', 'planned').select().single())
}

export async function deleteMod(modId, { status } = {}) {
  let q = supabase.from('mods').delete().eq('id', modId)
  if (status) q = q.eq('status', status)
  await run(q)
}
