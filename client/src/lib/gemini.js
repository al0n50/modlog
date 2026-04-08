const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

export async function getModRecommendations({ year, make, model, trim, installedMods, wishlistItems, budget }) {
  const modList     = installedMods?.length  > 0 ? installedMods.map(m  => `- ${m.name}${m.category ? ` (${m.category})` : ''}${m.brand ? `, ${m.brand}` : ''}`).join('\n') : 'None (stock)'
  const wishList    = wishlistItems?.length  > 0 ? wishlistItems.map(w  => `- ${w.name}${w.estimated_price ? ` (~$${w.estimated_price})` : ''}`).join('\n')                  : 'None'
  const budgetLine  = budget ? `Approximate budget for next mod: $${budget}` : 'No specific budget mentioned'

  const prompt = `
You are an expert automotive modification advisor. A car enthusiast needs your advice.

Vehicle: ${year} ${make} ${model}${trim ? ` ${trim}` : ''}

Currently Installed Mods:
${modList}

On Their Wishlist:
${wishList}

${budgetLine}

Based on this specific vehicle and their current build, recommend exactly 3 modifications they should consider next.

Respond ONLY with a valid JSON array. No markdown, no explanation, no extra text. Just the raw JSON array:
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

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || 'Gemini API request failed')
  }

  const data = await res.json()
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!raw) throw new Error('No response from Gemini')

  // Strip markdown fences if present
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('Could not parse AI response. Try again.')
  }
}