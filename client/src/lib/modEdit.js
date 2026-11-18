/**
 * Editing a mod (Build map, MVP feature 2): a done mod or a wishlist item → the edit form →
 * a checked database update. Pure, tested in tests/mod-edit.test.js. The limits mirror the
 * database's constraints, which enforce them anyway; checking here gives a clear message first.
 */
import { CATEGORIES } from './categories'

export const LIMITS = { name: 120, brand: 80, notes: 2000 }

// Today as YYYY-MM-DD in the person's time zone
export function localToday(now = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

// A done mod (database row) or a wishlist item (UI shape, price in estimated_price) → form values
export function editForm(mod) {
  const planned = mod.status === 'planned' || Object.hasOwn(mod, 'estimated_price')
  const price = planned ? mod.estimated_price : mod.price
  return {
    status:       planned ? 'planned' : 'done',
    name:         mod.name || '',
    category:     CATEGORIES.includes(mod.category) ? mod.category : 'Other',
    brand:        mod.brand || '',
    price:        price === null || price === undefined ? '' : String(price),
    install_date: planned ? '' : mod.install_date || '',
    notes:        mod.notes || '',
  }
}

/** Form values → { row } to save, or { error } with a message to show. */
export function modUpdate(form, today = localToday()) {
  const name = (form.name || '').trim()
  if (!name) return { error: 'Give the mod a name.' }
  if (name.length > LIMITS.name) return { error: `Keep the name under ${LIMITS.name} characters.` }

  const brand = (form.brand || '').trim()
  if (brand.length > LIMITS.brand) return { error: `Keep the brand under ${LIMITS.brand} characters.` }

  const notes = (form.notes || '').trim()
  if (notes.length > LIMITS.notes) return { error: `Keep the notes under ${LIMITS.notes} characters.` }

  if (!CATEGORIES.includes(form.category)) return { error: 'Pick a category.' }
  if (form.status !== 'done' && form.status !== 'planned') return { error: 'Choose done or planned.' }

  const rawPrice = String(form.price ?? '').trim().replace(/[$,]/g, '')
  const price = rawPrice === '' ? null : Number(rawPrice)
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: 'Enter the price as a number, like 420.' }

  // Only installed mods have an install date
  const date = form.status === 'done' ? (form.install_date || '').trim() : ''
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1886-01-01')) return { error: 'Enter a real install date.' }
  if (date && date > today) return { error: 'The install date can’t be in the future.' }

  return {
    row: {
      status:       form.status,
      name,
      category:     form.category,
      brand:        brand || null,
      price,
      install_date: date || null,
      notes:        notes || null,
    },
  }
}

// Put an item back where it was in a list, or at the end if it's new there
export function upsertById(list, item) {
  return list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [...list, item]
}
