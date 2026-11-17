import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny fake of the Supabase query builder that records what the store asks for
const calls = []
let nextResult = { data: null, error: null }
function builder(table) {
  const q = { table, ops: [] }
  calls.push(q)
  const chain = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return (resolve) => resolve(nextResult)
      return (...args) => { q.ops.push([prop, ...args]); return chain }
    },
  })
  return chain
}
vi.mock('../src/lib/supabase', () => ({ supabase: { from: (t) => builder(t) } }))

let useGarageStore
beforeEach(async () => {
  calls.length = 0
  vi.resetModules()
  ;({ useGarageStore } = await import('../src/store/useGarageStore.js'))
  useGarageStore.setState({
    vehicles: [{ id: 'v1', mods: [], wishlist_items: [{ id: 'w1', name: 'Downpipe', estimated_price: 450 }] }],
    activeVehicle: null,
  })
})

const op = (q, name) => q.ops.find(o => o[0] === name)

describe('garage store: one mods table with done/planned status', () => {
  it('loads vehicles with mods only, and splits them into done and planned', async () => {
    nextResult = { data: [{ id: 'v1', mods: [
      { id: 'a', status: 'done', name: 'Intake' }, { id: 'b', status: 'planned', name: 'Tune', price: 600 },
    ] }], error: null }
    await useGarageStore.getState().fetchVehicles('u1')
    expect(op(calls[0], 'select')[1]).toBe('*, mods(*)')
    const [v] = useGarageStore.getState().vehicles
    expect(v.mods.map(m => m.name)).toEqual(['Intake'])
    expect(v.wishlist_items).toEqual([expect.objectContaining({ name: 'Tune', estimated_price: 600 })])
  })

  it('loads a public profile with its sign-up date (for "Member Since")', async () => {
    nextResult = { data: { id: 'u1', username: 'al0n50', created_at: '2026-11-17T00:00:00Z' }, error: null }
    await useGarageStore.getState().fetchPublicVehiclesByUser('al0n50').catch(() => {})
    expect(op(calls[0], 'select')[1]).toMatch(/\bcreated_at\b/)
  })

  it('saves a new done mod with status done', async () => {
    nextResult = { data: { id: 'm9', vehicle_id: 'v1', name: 'Intake', category: 'Engine', status: 'done' }, error: null }
    await useGarageStore.getState().addMod('v1', { name: 'Intake', category: 'Engine' })
    expect(calls[0].table).toBe('mods')
    expect(op(calls[0], 'insert')[1]).toMatchObject({ vehicle_id: 'v1', status: 'done' })
  })

  it('saves a wishlist item as a planned mod', async () => {
    nextResult = { data: { id: 'm2', vehicle_id: 'v1', name: 'Tune', category: 'Engine', price: 600, status: 'planned', priority: 2 }, error: null }
    await useGarageStore.getState().addWishItem('v1', { name: 'Tune', category: 'Engine', estimated_price: 600, priority: 2 })
    expect(calls[0].table).toBe('mods')
    expect(op(calls[0], 'insert')[1]).toMatchObject({ status: 'planned', price: 600, priority: 2 })
    const v = useGarageStore.getState().vehicles[0]
    expect(v.wishlist_items.at(-1)).toMatchObject({ id: 'm2', estimated_price: 600 })
  })

  it('only deletes planned rows when removing a wishlist item', async () => {
    nextResult = { data: null, error: null }
    await useGarageStore.getState().deleteWishItem('v1', 'w1')
    expect(calls[0].table).toBe('mods')
    expect(calls[0].ops).toContainEqual(['eq', 'status', 'planned'])
    expect(useGarageStore.getState().vehicles[0].wishlist_items).toEqual([])
  })

  it('marks a planned mod done in place instead of copying and deleting', async () => {
    nextResult = { data: { id: 'w1', vehicle_id: 'v1', name: 'Downpipe', status: 'done' }, error: null }
    await useGarageStore.getState().promoteWishItem('v1', { id: 'w1' }, { name: 'Downpipe', category: 'Exhaust', price: 450 })
    const mods = calls.find(c => c.table === 'mods')
    expect(op(mods, 'update')[1]).toMatchObject({ status: 'done', name: 'Downpipe' })
    expect(mods.ops).toContainEqual(['eq', 'id', 'w1'])
    expect(calls.some(c => c.ops.some(o => o[0] === 'delete'))).toBe(false)
    const v = useGarageStore.getState().vehicles[0]
    expect(v.mods.map(m => m.id)).toEqual(['w1'])
    expect(v.wishlist_items).toEqual([])
  })
})
