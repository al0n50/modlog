import { supabase } from './supabase'

// Calls the /api/recommendations serverless function, which holds the Gemini key server-side.
export async function getModRecommendations({ year, make, model, trim, installedMods, wishlistItems, budget }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sign in to use the AI Advisor.')

  const res = await fetch('/api/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      year, make, model, trim,
      installedMods: (installedMods || []).map(({ name, category, brand }) => ({ name, category, brand })),
      wishlistItems: (wishlistItems || []).map(({ name, estimated_price }) => ({ name, estimated_price })),
      budget,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'AI Advisor request failed')
  if (!Array.isArray(data)) throw new Error('Could not parse AI response. Try again.')
  return data
}
