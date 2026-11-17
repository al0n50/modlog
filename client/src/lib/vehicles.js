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
const HEX_COLOR   = /^#[0-9A-Fa-f]{6}$/

// Body styles there's a generic 3D model for (Option B). Matches the database list.
export const BODY_STYLES = [
  ['sedan', 'Sedan'], ['coupe', 'Coupe'], ['convertible', 'Convertible'], ['hatchback', 'Hatchback'],
  ['wagon', 'Wagon'], ['suv', 'SUV / Crossover'], ['pickup', 'Pickup'], ['minivan', 'Minivan'], ['van', 'Van'],
]

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

// NHTSA returns makes in capitals ("HONDA", "MERCEDES-BENZ"). Store them the way people
// write them so the same make always matches (e.g. when picking a 3D model).
// Mixed-case input is assumed intentional and left alone.
const MAKE_ACRONYMS = new Set(['BMW', 'GMC', 'MG', 'AMC', 'SRT', 'VW', 'BYD', 'DS', 'TVR', 'KTM', 'RUF'])
const MAKE_SPECIAL  = { MCLAREN: 'McLaren', DELOREAN: 'DeLorean' }
export function formatMake(make) {
  const m = (make || '').trim().replace(/\s+/g, ' ')
  if (!m || (m !== m.toUpperCase() && m !== m.toLowerCase())) return m
  return m.toUpperCase().split(/([ -])/).map(w =>
    MAKE_SPECIAL[w] || (MAKE_ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())
  ).join('')
}

// Vehicle form (UI) → vehicle row (database). Keeps the exact-car details from a VIN decode.
export function vehicleRow(form) {
  const specs = form._specs || {}
  return {
    vin:        normalizeVin(form.vin),
    year:       parseInt(form.year, 10),
    make:       formatMake(form.make),
    model:      (form.model || '').trim(),
    trim:       (form.trim || '').trim() || null,
    body_class: (specs.bodyClass || '').trim() || null,
    // Picked by the owner; otherwise the database derives it from body_class
    body_style: BODY_STYLES.some(([v]) => v === form.body_style) ? form.body_style : null,
    color:      HEX_COLOR.test(form.color || '') ? form.color.toUpperCase() : null,
    specs,
  }
}

// The image to show for a car: its cover photo, or a placeholder with its name
export function coverImage(car) {
  const url = (car?.cover_image || '').trim()
  if (/^https?:\/\//i.test(url)) return url
  const label = [car?.make, car?.model].filter(Boolean).join(' ').slice(0, 40) || 'No Image'
  return `https://placehold.co/600x400/1a1a1a/orange?text=${encodeURIComponent(label)}`
}
