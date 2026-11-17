import { beforeEach, describe, expect, it, vi } from 'vitest'

// Fake Supabase: records each query and answers with the next queued result
const calls = []
const results = []
function builder(table) {
  const q = { table, ops: [] }
  calls.push(q)
  const chain = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return (resolve) => resolve(results.shift() ?? { data: null, error: null })
      return (...args) => { q.ops.push([prop, ...args]); return chain }
    },
  })
  return chain
}
const storageCalls = []
const storageApi = {
  list: async (folder) => { storageCalls.push(['list', folder]); return { data: [{ name: 'a.jpg' }, { name: 'b.jpg' }], error: null } },
  remove: async (paths) => { storageCalls.push(['remove', paths]); return { data: [], error: null } },
}
vi.mock('../src/lib/supabase', () => ({
  supabase: { from: (t) => builder(t), rpc: (fn, args) => builder(`rpc:${fn}:${JSON.stringify(args)}`), storage: { from: () => storageApi } },
}))
const db = await import('../src/lib/db')

beforeEach(() => { calls.length = 0; results.length = 0; storageCalls.length = 0 })
const op = (q, name) => q.ops.find(o => o[0] === name)

describe('friendly errors', () => {
  it('turns database rule violations into plain messages', () => {
    expect(db.friendlyMessage({ code: '23514', message: 'new row violates check constraint "vehicles_vin_format"' }))
      .toMatch(/never use I, O, or Q/)
    expect(db.friendlyMessage({ code: '23514', message: 'violates check constraint "something_new"' })).toMatch(/aren't valid/)
    expect(db.friendlyMessage({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/permission/)
    expect(db.friendlyMessage({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/session expired/)
    expect(db.friendlyMessage(new TypeError('Failed to fetch'))).toMatch(/connection/)
  })
  it('throws DataError with the original error kept', async () => {
    results.push({ data: null, error: { code: '23514', message: 'violates check constraint "mods_price_nonnegative"' } })
    const err = await db.addDoneMod('v1', { name: 'X', price: -1 }).catch(e => e)
    expect(err).toBeInstanceOf(db.DataError)
    expect(err.message).toBe("Price can't be negative.")
    expect(err.code).toBe('23514')
    expect(err.cause.message).toMatch(/mods_price_nonnegative/)
  })
})

describe('data layer', () => {
  it('pages public builds from summaries and knows when there are more', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, done_count: 5, recent_mods: [{ id: 'm', name: 'Intake' }], username: 'al0n50' }))
    results.push({ data: rows, error: null })
    const { items, hasMore } = await db.listPublicBuilds({ page: 1, pageSize: 2 })
    expect(calls[0].table).toBe('vehicle_summaries')
    expect(op(calls[0], 'range').slice(1)).toEqual([2, 4])
    expect(hasMore).toBe(true)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ mod_count: 5, mods: [{ name: 'Intake' }], profiles: { username: 'al0n50' } })
  })

  it('never writes timeline events itself (the database does)', async () => {
    results.push({ data: { id: 'm1', status: 'done' }, error: null })
    await db.addDoneMod('v1', { name: 'Intake', category: 'Engine' })
    results.push({ data: { id: 'm2', status: 'done' }, error: null })
    await db.markPlannedDone('m2', { name: 'Tune', category: 'Engine' })
    await db.deleteMod('m1')
    expect(calls.map(c => c.table)).not.toContain('build_events')
  })

  it('only marks planned mods as done', async () => {
    results.push({ data: { id: 'm2', status: 'done' }, error: null })
    await db.markPlannedDone('m2', { name: 'Tune', category: 'Engine', price: '' })
    expect(op(calls[0], 'update')[1]).toMatchObject({ status: 'done', price: null })
    expect(calls[0].ops.filter(o => o[0] === 'eq')).toEqual([['eq', 'id', 'm2'], ['eq', 'status', 'planned']])
  })

  it('deletes a car\'s photos before the car', async () => {
    await db.deleteVehicle({ id: 'v1', user_id: 'u1' })
    expect(storageCalls).toEqual([['list', 'u1/v1'], ['remove', ['u1/v1/a.jpg', 'u1/v1/b.jpg']]])
    expect(calls[0].table).toBe('vehicles')
    expect(op(calls[0], 'delete')).toBeTruthy()
  })

  it('reports a missing or private build clearly', async () => {
    results.push({ data: null, error: null })
    await expect(db.getVehicle('nope')).rejects.toThrow(/doesn't exist or is private/)
  })

  it('asks the database which 3D model to show', async () => {
    results.push({ data: [{ kind: 'body_style', body_style: 'coupe' }], error: null })
    expect(await db.getCarModel('v1')).toEqual({ kind: 'body_style', body_style: 'coupe' })
    expect(calls[0].table).toBe('rpc:car_model_for:{"v_id":"v1"}')
  })
})
