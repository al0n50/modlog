// Data helpers for vehicles and mods.
//
// In the database, every mod lives in one `mods` table with a status:
//   'done'    — installed on the car
//   'planned' — something the owner wants to do next
// The screens still work with two lists, so normalizeVehicle() splits them:
//   vehicle.mods            → done mods
//   vehicle.wishlist_items  → planned mods (with the field names the wishlist UI uses)

export const VEHICLE_SELECT = '*, mods(*)'

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

// Planned mod row (database) → wishlist item (UI)
export function toWishItem(mod) {
  return {
    id:              mod.id,
    vehicle_id:      mod.vehicle_id,
    name:            mod.name,
    category:        mod.category,
    brand:           mod.brand,
    estimated_price: mod.price,
    url:             mod.url,
    priority:        mod.priority,
    created_at:      mod.created_at,
  }
}

// Wishlist form (UI) → planned mod row (database)
export function plannedModRow(vehicleId, item) {
  return {
    vehicle_id: vehicleId,
    status:     'planned',
    name:       item.name,
    category:   item.category || 'Other',
    brand:      item.brand || null,
    price:      item.estimated_price ?? null,
    url:        item.url || null,
    priority:   Math.min(3, Math.max(1, Number(item.priority) || 1)),
  }
}

// Split a vehicle's mods into done (mods) and planned (wishlist_items)
export function normalizeVehicle(vehicle) {
  if (!vehicle) return vehicle
  const all = vehicle.mods || []
  return {
    ...vehicle,
    mods:           all.filter(m => (m.status || 'done') === 'done'),
    wishlist_items: all.filter(m => m.status === 'planned').map(toWishItem),
  }
}

// Clean up a VIN: trim, uppercase, empty → null
export function normalizeVin(vin) {
  const v = (vin || '').trim().toUpperCase()
  return v || null
}

// Returns an error message for an invalid VIN, or null if it's fine (or empty)
export function vinError(vin) {
  const v = normalizeVin(vin)
  if (!v) return null
  if (!VIN_PATTERN.test(v)) return 'VIN must be 17 letters and numbers (VINs never use I, O, or Q).'
  return null
}

// Vehicle form (UI) → vehicle row (database). Keeps the exact-car details from a VIN decode.
export function vehicleRow(form) {
  const specs = form._specs || {}
  return {
    vin:        normalizeVin(form.vin),
    year:       parseInt(form.year, 10),
    make:       (form.make || '').trim(),
    model:      (form.model || '').trim(),
    trim:       (form.trim || '').trim() || null,
    body_class: (specs.bodyClass || '').trim() || null,
    specs,
  }
}
