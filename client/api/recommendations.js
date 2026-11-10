// Vercel serverless function: POST /api/recommendations
// Keeps the Gemini API key on the server and only answers signed-in ModLog users.
import { createClient } from '@supabase/supabase-js'

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

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
  if (!apiKey) return res.status(500).json({ error: 'AI Advisor is not configured (missing GEMINI_API_KEY).' })

  // Require a valid Supabase session so the endpoint can't be used as an open proxy
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sign in to use the AI Advisor.' })
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Session expired. Sign in again.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  if (!body.make || !body.model) return res.status(400).json({ error: 'Vehicle make and model are required.' })

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(body) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
      }
    )

    const data = await r.json().catch(() => ({}))
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
