import { create } from 'zustand'
import * as db from '../lib/db'

// Apply a change to a car wherever it's held (garage list and the open build page)
const patchVehicle = (s, vehicleId, fn) => ({
  vehicles:      s.vehicles.map(v => v.id === vehicleId ? fn(v) : v),
  activeVehicle: s.activeVehicle?.id === vehicleId ? fn(s.activeVehicle) : s.activeVehicle,
})

export const useGarageStore = create((set, get) => ({
  vehicles:      [],
  activeVehicle: null,
  loading:       false,
  error:         null,

  // ── Vehicles ──────────────────────────────────────────────
  fetchVehicles: async (userId) => {
    set({ loading: true, error: null })
    try {
      set({ vehicles: await db.listMyVehicles(userId), loading: false })
    } catch (e) { set({ error: e.message, loading: false }) }
  },

  fetchVehicleById: async (vehicleId) => {
    set({ loading: true, error: null, activeVehicle: null })
    try {
      set({ activeVehicle: await db.getVehicle(vehicleId), loading: false })
    } catch (e) { set({ error: e.message, loading: false }) }
  },

  addVehicle: async (vehicleData, userId) => {
    const vehicle = await db.createVehicle(vehicleData, userId)
    set(s => ({ vehicles: [vehicle, ...s.vehicles] }))
    return vehicle
  },

  deleteVehicle: async (vehicleId) => {
    const s = get()
    const vehicle = s.vehicles.find(v => v.id === vehicleId) ||
      (s.activeVehicle?.id === vehicleId ? s.activeVehicle : null)
    if (!vehicle) throw new db.DataError('This build is no longer in your garage.')
    await db.deleteVehicle(vehicle)
    set(st => ({
      vehicles:      st.vehicles.filter(v => v.id !== vehicleId),
      activeVehicle: st.activeVehicle?.id === vehicleId ? null : st.activeVehicle,
    }))
  },

  // ── Public feeds (build summaries, paged) ──────────────────
  fetchPublicVehicles: (opts) => db.listPublicBuilds(opts),
  fetchPublicVehiclesByUser: (username) => db.getPublicGarage(username),

  togglePublic: async (vehicleId, currentValue) => {
    await db.updateVehicle(vehicleId, { is_public: !currentValue })
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, is_public: !currentValue })))
  },

  updateCoverImage: async (vehicleId, imageUrl) => {
    await db.updateVehicle(vehicleId, { cover_image: imageUrl })
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, cover_image: imageUrl })))
  },

  // ── Done mods (the database records each change on the build timeline) ──
  addMod: async (vehicleId, modData) => {
    const mod = await db.addDoneMod(vehicleId, modData)
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, mods: [...v.mods, mod] })))
    return mod
  },

  deleteMod: async (vehicleId, modId) => {
    await db.deleteMod(modId)
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, mods: v.mods.filter(m => m.id !== modId) })))
  },

  // ── Planned mods (the wishlist) ────────────────────────────
  addWishItem: async (vehicleId, itemData) => {
    const item = await db.addPlannedMod(vehicleId, itemData)
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, wishlist_items: [...v.wishlist_items, item] })))
    return item
  },

  deleteWishItem: async (vehicleId, itemId) => {
    await db.deleteMod(itemId, { status: 'planned' })
    set(s => patchVehicle(s, vehicleId, v => ({ ...v, wishlist_items: v.wishlist_items.filter(w => w.id !== itemId) })))
  },

  promoteWishItem: async (vehicleId, wishItem, modData) => {
    const mod = await db.markPlannedDone(wishItem.id, modData)
    set(s => patchVehicle(s, vehicleId, v => ({
      ...v,
      mods:           [...v.mods, mod],
      wishlist_items: v.wishlist_items.filter(w => w.id !== wishItem.id),
    })))
    return mod
  },
}))
