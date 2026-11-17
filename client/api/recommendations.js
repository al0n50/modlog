// Vercel serverless function: POST /api/recommendations
// Keeps the Gemini API key on the server and only answers signed-in ModLog users.
import { createClient } from '@supabase/supabase-js'

// Free-tier models, tried in order. Google renames and retires models, so if one is
// no longer found (404) the next is used instead of the advisor breaking.
// GEMINI_MODEL, if set, is tried first.
export const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(Boolean))]
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
export const HOURLY_LIMIT = Number(process.env.AI_HOURLY_LIMIT) || 10

const str = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '')
const list = (v, max = 50) => (Array.isArray(v) ? v.slice(0, max) : [])

function buildPrompt({ year, make, model, trim, installedMods, wishlistItems, budget }) {
  const mods = list(installedMods)
  const wishes = list(wishlistItems)
  const modList = mods.length
    ? mods.map(m => `- ${str(m?.name)}${m?.category ? ` (${str(m.category, 40)})` : ''}${m?.brand ? `, ${str(m.brand, 60)}` : ''}`).join('\n')
    : 'None (stock)'
  const wishList = wishes.length
    ? wishes.map(w => `- ${str(w?.name)}${w?.estimated_price ? ` (~$${Number(w.estimated_price) || ''})` : ''}`).join('\n')
    : 'None'
  const budgetNum = Number(budget)
  const budgetLine = budgetNum > 0 ? `Approximate budget for next mod: $${budgetNum}` : 'No specific budget mentioned'

  return `
You are an expert automotive modification advisor. A car enthusiast needs your advice.

Vehicle: ${Number(year) || ''} ${str(make, 60)} ${str(model, 60)}${trim ? ` ${str(trim, 60)}` : ''}

Currently Installed Mods:
${modList}

On Their Wishlist:
${wishList}

${budgetLine}

Based on this specific vehicle and their current build, recommend exactly 3 modifications they should consider next.

Respond ONLY with a valid JSON array, no markdown or extra text, in this shape:
[
  {
    "name": "modification name",
    "category": "one of: Engine, Suspension, Exterior, Interior, Wheels & Tires, Audio, Lighting, Brakes, Exhaust, Transmission, Other",
    "reason": "2-3 sentence explanation of why this mod suits this specific car and build",
    "estimatedCost": 500,
    "difficulty": "Bolt-On" | "Moderate" | "Professional Required",
    "synergy": "brief note on how it pairs with their existing mods, or null if not applicable"
  }
]
`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('AI Advisor: GEMINI_API_KEY is not set')
    return res.status(503).json({ error: 'The AI Advisor is not set up yet.' })
  }

  // Require a valid Supabase session so the endpoint can't be used as an open proxy.
  // Fail closed: without Supabase config there is no way to check the session.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'AI Advisor is not configured (missing Supabase settings).' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sign in to use the AI Advisor.' })

  // A client that acts as this user, so the database's security rules apply to every query below
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth?.user) return res.status(401).json({ error: 'Session expired. Sign in again.' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Request body must be JSON.' })
  }
  if (!body.make || !body.model) return res.status(400).json({ error: 'Vehicle make and model are required.' })

  // Rate limit: each user gets HOURLY_LIMIT advisor requests per rolling hour
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
  if (countError) return res.status(503).json({ error: 'AI Advisor is temporarily unavailable. Try again shortly.' })
  if ((count ?? 0) >= HOURLY_LIMIT) {
    res.setHeader('Retry-After', '3600')
    return res.status(429).json({ error: `You've used all ${HOURLY_LIMIT} AI suggestions for this hour. Try again later.` })
  }
  const { error: logError } = await supabase.from('ai_requests').insert({})
  if (logError) return res.status(503).json({ error: 'AI Advisor is temporarily unavailable. Try again shortly.' })

  try {
    const request = JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(body) }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    })
    let r, data
    for (const model of MODELS) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: request,
      })
      data = await r.json().catch(() => ({}))
      if (r.status !== 404) break
    }
    if (r.status === 429) {
      return res.status(503).json({ error: 'The AI Advisor is busy right now (Gemini usage limit). Try again in a minute.' })
    }
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      // Bad or blocked key: a setup problem for the site owner, not something the user can fix
      console.error('Gemini rejected the request:', r.status, data?.error?.message)
      return res.status(503).json({ error: 'The AI Advisor is temporarily unavailable.' })
    }
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Gemini API request failed' })

    const raw = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought && typeof p.text === 'string')
      .map(p => p.text)
      .join('')
    if (!raw) return res.status(502).json({ error: 'No response from Gemini' })

    const recs = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return res.status(200).json(Array.isArray(recs) ? recs : [])
  } catch {
    return res.status(502).json({ error: 'Could not parse AI response. Try again.' })
  }
}
