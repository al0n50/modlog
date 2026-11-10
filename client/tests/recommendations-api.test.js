import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }))

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

  it('reports missing server config', async () => {
    delete process.env.GEMINI_API_KEY
    const r = res(); await handler(req(), r)
    expect(r.statusCode).toBe(500)
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
