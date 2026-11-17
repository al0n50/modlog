import { beforeEach, describe, expect, it, vi } from 'vitest'

let dbError = null
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ select: () => ({ limit: async () => ({ error: dbError }) }) }) }),
}))
const res = () => {
  const r = { statusCode: 0, body: null, headers: {} }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}
let handler
beforeEach(async () => {
  vi.resetModules()
  dbError = null
  process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  handler = (await import('../api/health.js')).default
})

describe('GET /api/health', () => {
  it('reports the database is up', async () => {
    const r = res(); await handler({ method: 'GET' }, r)
    expect(r.statusCode).toBe(200)
    expect(r.body).toMatchObject({ ok: true, database: 'up' })
    expect(r.headers['Cache-Control']).toBe('no-store')
  })
  it('returns 503 when the database is unreachable', async () => {
    dbError = { message: 'paused' }
    const r = res(); await handler({ method: 'GET' }, r)
    expect(r.statusCode).toBe(503)
  })
  it('rejects other methods', async () => {
    const r = res(); await handler({ method: 'POST' }, r)
    expect(r.statusCode).toBe(405)
  })
})
