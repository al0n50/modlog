import { afterEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession } } }))
const { getModRecommendations } = await import('../src/lib/gemini')

afterEach(() => vi.unstubAllGlobals())

describe('getModRecommendations (browser)', () => {
  it('requires a session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    await expect(getModRecommendations({ make: 'Mazda', model: 'MX-5' })).rejects.toThrow(/Sign in/)
  })

  it('calls the server function with the access token and trims mod data', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'Wheels' }] }))
    const recs = await getModRecommendations({
      year: 2019, make: 'Mazda', model: 'MX-5',
      installedMods: [{ id: 'm1', name: 'Exhaust', category: 'Exhaust', brand: 'Borla', price: 900, user_id: 'secret' }],
    })
    expect(recs).toEqual([{ name: 'Wheels' }])
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/recommendations')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body).installedMods).toEqual([{ name: 'Exhaust', category: 'Exhaust', brand: 'Borla' }])
  })

  it('throws the server error message', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Session expired' }) }))
    await expect(getModRecommendations({ make: 'a', model: 'b' })).rejects.toThrow('Session expired')
  })
})
