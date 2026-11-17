import { describe, expect, it } from 'vitest'
import { normalizeVehicle, plannedModRow, toWishItem, normalizeVin, vinError, vehicleRow } from '../src/lib/vehicles.js'

const car = {
  id: 'v1', make: 'Subaru', model: 'WRX',
  mods: [
    { id: 'm1', vehicle_id: 'v1', name: 'Coilovers', category: 'Suspension', price: 1200, status: 'done' },
    { id: 'm2', vehicle_id: 'v1', name: 'Downpipe', category: 'Exhaust', price: 450, url: 'https://x', priority: 3, status: 'planned' },
    { id: 'm3', vehicle_id: 'v1', name: 'Old row', category: 'Other' }, // pre-migration rows have no status
  ],
}

describe('normalizeVehicle', () => {
  it('splits mods into done and planned', () => {
    const v = normalizeVehicle(car)
    expect(v.mods.map(m => m.id)).toEqual(['m1', 'm3'])
    expect(v.wishlist_items.map(w => w.id)).toEqual(['m2'])
  })
  it('maps planned mods to the wishlist shape the UI uses', () => {
    const [w] = normalizeVehicle(car).wishlist_items
    expect(w).toMatchObject({ name: 'Downpipe', estimated_price: 450, url: 'https://x', priority: 3 })
  })
  it('handles a car with no mods and null input', () => {
    expect(normalizeVehicle({ id: 'v2' })).toMatchObject({ mods: [], wishlist_items: [] })
    expect(normalizeVehicle(null)).toBe(null)
  })
  it('does not mutate the original row', () => {
    normalizeVehicle(car)
    expect(car.mods).toHaveLength(3)
  })
})

describe('plannedModRow / toWishItem', () => {
  it('builds a planned mod row from the wishlist form', () => {
    expect(plannedModRow('v1', { name: 'Tune', category: 'Engine', estimated_price: 600, priority: 2 }))
      .toEqual({ vehicle_id: 'v1', status: 'planned', name: 'Tune', category: 'Engine', brand: null, price: 600, url: null, priority: 2 })
  })
  it('clamps priority to 1–3 and defaults the category', () => {
    expect(plannedModRow('v1', { name: 'A', priority: 9 })).toMatchObject({ priority: 3, category: 'Other' })
    expect(plannedModRow('v1', { name: 'A', priority: 0 })).toMatchObject({ priority: 1 })
  })
  it('round-trips through toWishItem', () => {
    const w = toWishItem({ id: 'x', ...plannedModRow('v1', { name: 'Tune', estimated_price: 600 }) })
    expect(w).toMatchObject({ id: 'x', name: 'Tune', estimated_price: 600 })
  })
})

describe('VIN handling', () => {
  it('normalizes VINs', () => {
    expect(normalizeVin('  jf1va1a60k9800001 ')).toBe('JF1VA1A60K9800001')
    expect(normalizeVin('')).toBe(null)
    expect(normalizeVin(undefined)).toBe(null)
  })
  it('accepts valid VINs and empty input', () => {
    expect(vinError('JF1VA1A60K9800001')).toBe(null)
    expect(vinError('')).toBe(null)
  })
  it('rejects wrong length and the letters I, O, Q', () => {
    expect(vinError('ABC')).toMatch(/17/)
    expect(vinError('JF1VA1A60K98000I1')).toMatch(/I, O, or Q/)
  })
})

describe('vehicleRow', () => {
  it('keeps the exact-car details from a VIN decode', () => {
    const row = vehicleRow({ vin: 'jf1va1a60k9800001', year: '2019', make: ' Subaru ', model: 'WRX', trim: '',
      _specs: { bodyClass: 'Sedan/Saloon', drivetrain: 'AWD' } })
    expect(row).toEqual({ vin: 'JF1VA1A60K9800001', year: 2019, make: 'Subaru', model: 'WRX', trim: null,
      body_class: 'Sedan/Saloon', specs: { bodyClass: 'Sedan/Saloon', drivetrain: 'AWD' } })
  })
  it('works for manual entry with no decode', () => {
    expect(vehicleRow({ year: '2021', make: 'Toyota', model: 'GR86' })).toMatchObject({ vin: null, body_class: null, specs: {} })
  })
})

describe('formatMake', () => {
  it('writes NHTSA capitals the way people do', async () => {
    const { formatMake } = await import('../src/lib/vehicles')
    expect(formatMake('HONDA')).toBe('Honda')
    expect(formatMake('MERCEDES-BENZ')).toBe('Mercedes-Benz')
    expect(formatMake('ALFA  ROMEO ')).toBe('Alfa Romeo')
    expect(formatMake('BMW')).toBe('BMW')
    expect(formatMake('MCLAREN')).toBe('McLaren')
    expect(formatMake('chevrolet')).toBe('Chevrolet')
  })
  it('leaves mixed case and empty input alone', async () => {
    const { formatMake } = await import('../src/lib/vehicles')
    expect(formatMake('McLaren')).toBe('McLaren')
    expect(formatMake('')).toBe('')
    expect(formatMake(null)).toBe('')
  })
})
