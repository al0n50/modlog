// GET /api/health — confirms the app can reach its database.
// A daily Vercel cron job calls this so the free Supabase project never goes
// idle long enough to be paused (it pauses after about a week without activity).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ ok: false, database: 'not configured' })
  }

  const started = Date.now()
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1)
  const ms = Date.now() - started

  if (error) return res.status(503).json({ ok: false, database: 'unreachable', ms })
  return res.status(200).json({ ok: true, database: 'up', ms })
}
