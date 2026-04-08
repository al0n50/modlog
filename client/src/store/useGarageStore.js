import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Helper: silently log a build timeline event
async function logEvent(vehicleId, type, description, metadata = {}) {
  await supabase.from('build_events').insert({
    vehicle_id:  vehicleId,
    event_type:  type,
    description,
    metadata,
  })
}

export const useGarageStore = create((set) => ({
  vehicles:      [],
  activeVehicle: null,
  loading:       false,
  error:         null,

  // ── Vehicles ──────────────────────────────────────────────
  fetchVehicles: async (userId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, mods(*), wishlist_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message, loading: false }); return }
    set({ vehicles: data, loading: false })
  },

  fetchVehicleById: async (vehicleId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, mods(*), wishlist_items(*)')
      .eq('id', vehicleId)
      .single()

    if (error) { set({ error: error.message, loading: false }); return }
    set({ activeVehicle: data, loading: false })
  },

  addVehicle: async (vehicleData, userId) => {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...vehicleData, user_id: userId })
      .select('*, mods(*), wishlist_items(*)')
      .single()

    if (error) throw error
    set(s => ({ vehicles: [data, ...s.vehicles] }))
    return data
  },

  deleteVehicle: async (vehicleId) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId)
    if (error) throw error
    set(s => ({ vehicles: s.vehicles.filter(v => v.id !== vehicleId) }))
  },

  updateCoverImage: async (vehicleId, imageUrl) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ cover_image: imageUrl })
      .eq('id', vehicleId)

    if (error) throw error

    const update = (v) => v.id === vehicleId ? { ...v, cover_image: imageUrl } : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId
        ? { ...s.activeVehicle, cover_image: imageUrl }
        : s.activeVehicle,
    }))
  },

  // ── Installed Mods ────────────────────────────────────────
  addMod: async (vehicleId, modData) => {
    const { data, error } = await supabase
      .from('mods')
      .insert({ ...modData, vehicle_id: vehicleId })
      .select()
      .single()

    if (error) throw error

    // Auto-log timeline event
    await logEvent(vehicleId, 'mod_added',
      `Added ${data.category !== 'Other' ? data.category + ': ' : ''}${data.name}`,
      { mod_id: data.id, category: data.category, price: data.price }
    )

    const update = (v) => v.id === vehicleId ? { ...v, mods: [...v.mods, data] } : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId
        ? { ...s.activeVehicle, mods: [...s.activeVehicle.mods, data] }
        : s.activeVehicle,
    }))
  },

  deleteMod: async (vehicleId, modId, modName) => {
    const { error } = await supabase.from('mods').delete().eq('id', modId)
    if (error) throw error

    await logEvent(vehicleId, 'mod_removed', `Removed: ${modName || 'a mod'}`, { mod_id: modId })

    const update = (v) => v.id === vehicleId ? { ...v, mods: v.mods.filter(m => m.id !== modId) } : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId
        ? { ...s.activeVehicle, mods: s.activeVehicle.mods.filter(m => m.id !== modId) }
        : s.activeVehicle,
    }))
  },

  // ── Wishlist ──────────────────────────────────────────────
  addWishItem: async (vehicleId, itemData) => {
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({ ...itemData, vehicle_id: vehicleId })
      .select()
      .single()

    if (error) throw error

    const update = (v) => v.id === vehicleId ? { ...v, wishlist_items: [...v.wishlist_items, data] } : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId
        ? { ...s.activeVehicle, wishlist_items: [...s.activeVehicle.wishlist_items, data] }
        : s.activeVehicle,
    }))
  },

  deleteWishItem: async (vehicleId, itemId) => {
    const { error } = await supabase.from('wishlist_items').delete().eq('id', itemId)
    if (error) throw error

    const update = (v) => v.id === vehicleId
      ? { ...v, wishlist_items: v.wishlist_items.filter(w => w.id !== itemId) }
      : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId
        ? { ...s.activeVehicle, wishlist_items: s.activeVehicle.wishlist_items.filter(w => w.id !== itemId) }
        : s.activeVehicle,
    }))
  },

  promoteWishItem: async (vehicleId, wishItem, modData) => {
    const { data: mod, error: modErr } = await supabase
      .from('mods')
      .insert({
        vehicle_id:   vehicleId,
        name:         modData.name,
        category:     modData.category,
        brand:        modData.brand        || null,
        price:        modData.price        || null,
        install_date: modData.install_date || null,
        notes:        modData.notes        || null,
      })
      .select()
      .single()

    if (modErr) throw modErr

    const { error: delErr } = await supabase
      .from('wishlist_items').delete().eq('id', wishItem.id)
    if (delErr) throw delErr

    await logEvent(vehicleId, 'wishlist_promoted',
      `Installed from wishlist: ${mod.name}`,
      { mod_id: mod.id, wish_id: wishItem.id, category: mod.category }
    )

    const update = (v) => v.id === vehicleId ? {
      ...v,
      mods:          [...v.mods, mod],
      wishlist_items: v.wishlist_items.filter(w => w.id !== wishItem.id)
    } : v
    set(s => ({
      vehicles:      s.vehicles.map(update),
      activeVehicle: s.activeVehicle?.id === vehicleId ? {
        ...s.activeVehicle,
        mods:          [...s.activeVehicle.mods, mod],
        wishlist_items: s.activeVehicle.wishlist_items.filter(w => w.id !== wishItem.id)
      } : s.activeVehicle,
    }))
  },
}))