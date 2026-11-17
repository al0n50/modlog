import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const usage = { count: 0, countError: null, insertError: null, inserted: 0 }
const createClient = vi.fn(() => ({
  auth: { getUser },
  from: (table) => {
    if (table !== 'ai_requests') throw new Error(`unexpected table ${table}`)
    return {
      select: () => ({ gte: async () => ({ count: usage.count, error: usage.countError }) }),
      insert: async () => { usage.inserted++; return { error: usage.insertError } },
    }
  },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: (...a) => createClient(...a) }))

const res = () => {
  const r = { statusCode: 0, body: null, headers: {} }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}
const req = (over = {}) => ({
  method: 'POST',
  headers: { authorization: 'Bearer good' },
  body: { year: 2015, make: 'Subaru', model: 'WRX', installedMods: [{ name: 'Intake', category: 'Engine' }] },
  ...over,
})
const geminiReply = (text, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, json: async () => (ok ? { candidates: [{ content: { parts: [{ text }] } }] } : { error: { message: 'quota' } }),
  }))

let handler
beforeEach(async () => {
  vi.resetModules()
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  Object.assign(usage, { count: 0, countError: null, insertError: null, inserted: 0 })
  createClient.mockClear()
  handler = (await import('../api/recommendations.js')).default
})
afterEach(() => vi.unstubAllGlobals())

describe('POST /api/recommendations', () => {
  it('only allows POST', async () => {
    const r = res(); await handler(req({ method: 'GET' }), r)
    expect(r.statusCode).toBe(405)
    expect(r.headers.Allow).toBe('POST')
  })

  it('requires a signed-in user', async () => {
    let r = res(); await handler(req({ headers: {} }), r)
    expect(r.statusCode).toBe(401)
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } })
    r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(401)
  })

  it('validates the vehicle', async () => {
    const r = res(); await handler(req({ body: { year: 2015 } }), r)
    expect(r.statusCode).toBe(400)
  })

  it('reports a missing Gemini key without exposing setup details', async () => {
    delete process.env.GEMINI_API_KEY
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(503)
    expect(r.body.error).not.toMatch(/GEMINI_API_KEY/)
  })

  it('falls back to the next free model when Google no longer has one (404)', async () => {
    const { MODELS } = await import('../api/recommendations.js')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: { message: 'model not found' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }) }))
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(200)
    expect(fetch.mock.calls.map(c => c[0].match(/models\/([^:]+)/)[1])).toEqual(MODELS.slice(0, 2))
  })

  it('explains Gemini usage limits and hides key problems from users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { message: 'Resource exhausted' } }) }))
    let r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(503)
    expect(r.body.error).toMatch(/busy/)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'API key not valid' } }) }))
    r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(503)
    expect(r.body.error).not.toMatch(/key/i)
  })

  it('returns parsed recommendations and keeps the key out of the URL', async () => {
    const recs = [{ name: 'Coilovers', category: 'Suspension', estimatedCost: 1200 }]
    geminiReply('```json\n' + JSON.stringify(recs) + '\n```')
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(200)
    expect(r.body).toEqual(recs)
    const [url, init] = fetch.mock.calls[0]
    expect(url).not.toContain('test-key')
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    expect(JSON.parse(init.body).contents[0].parts[0].text).toContain('2015 Subaru WRX')
  })

  it('surfaces Gemini errors and unparseable output as 502', async () => {
    geminiReply('', false)
    let r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(502)
    expect(r.body.error).toBe('quota')
    geminiReply('not json')
    r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(502)
  })
})

describe('AI advisor rate limiting and auth hardening', () => {
  it('fails closed when Supabase settings are missing (never skips the sign-in check)', async () => {
    delete process.env.VITE_SUPABASE_URL
    delete process.env.SUPABASE_URL
    vi.resetModules()
    const h = (await import('../api/recommendations.js')).default
    const r = res(); await h(req(), r)
    expect(r.statusCode).toBe(500)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('queries the database as the signed-in user', async () => {
    geminiReply('[]')
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(200)
    const opts = createClient.mock.calls[0][2]
    expect(opts.global.headers.Authorization).toBe('Bearer good')
  })

  it('counts each successful request', async () => {
    geminiReply('[]')
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(200)
    expect(usage.inserted).toBe(1)
  })

  it('returns 429 with Retry-After once the hourly limit is reached, without calling Gemini', async () => {
    const { HOURLY_LIMIT } = await import('../api/recommendations.js')
    usage.count = HOURLY_LIMIT
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy)
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(429)
    expect(r.headers['Retry-After']).toBe('3600')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(usage.inserted).toBe(0)
  })

  it('fails closed (503) if usage cannot be checked or logged', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy)
    usage.countError = { message: 'db down' }
    let r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(503)
    usage.countError = null; usage.insertError = { message: 'denied' }
    r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(503)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects bad JSON and missing vehicles without using up the quota', async () => {
    let r = res(); await handler(req({ body: '{not json' }), r)
    expect(r.statusCode).toBe(400)
    r = res(); await handler(req({ body: { year: 2015 } }), r)
    expect(r.statusCode).toBe(400)
    expect(usage.inserted).toBe(0)
  })
})
