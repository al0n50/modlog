import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGarageStore = create((set) => ({
  vehicles: [],
  loading: false,
  error: null,

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

  // ── Installed Mods ────────────────────────────────────────
  addMod: async (vehicleId, modData) => {
    const { data, error } = await supabase
      .from('mods')
      .insert({ ...modData, vehicle_id: vehicleId })
      .select()
      .single()

    if (error) throw error
    set(s => ({
      vehicles: s.vehicles.map(v =>
        v.id === vehicleId ? { ...v, mods: [...v.mods, data] } : v
      )
    }))
  },

  deleteMod: async (vehicleId, modId) => {
    const { error } = await supabase.from('mods').delete().eq('id', modId)
    if (error) throw error
    set(s => ({
      vehicles: s.vehicles.map(v =>
        v.id === vehicleId ? { ...v, mods: v.mods.filter(m => m.id !== modId) } : v
      )
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
    set(s => ({
      vehicles: s.vehicles.map(v =>
        v.id === vehicleId ? { ...v, wishlist_items: [...v.wishlist_items, data] } : v
      )
    }))
  },

  deleteWishItem: async (vehicleId, itemId) => {
    const { error } = await supabase.from('wishlist_items').delete().eq('id', itemId)
    if (error) throw error
    set(s => ({
      vehicles: s.vehicles.map(v =>
        v.id === vehicleId
          ? { ...v, wishlist_items: v.wishlist_items.filter(w => w.id !== itemId) }
          : v
      )
    }))
  },

  // Story 1.2 — promote wishlist item → installed mod
  promoteWishItem: async (vehicleId, item) => {
    const { data: mod, error: modErr } = await supabase
      .from('mods')
      .insert({ name: item.name, category: item.category, vehicle_id: vehicleId })
      .select()
      .single()

    if (modErr) throw modErr

    const { error: delErr } = await supabase
      .from('wishlist_items').delete().eq('id', item.id)
    if (delErr) throw delErr

    set(s => ({
      vehicles: s.vehicles.map(v =>
        v.id === vehicleId ? {
          ...v,
          mods: [...v.mods, mod],
          wishlist_items: v.wishlist_items.filter(w => w.id !== item.id)
        } : v
      )
    }))
  },
}))