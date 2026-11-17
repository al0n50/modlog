import { supabase } from '../supabase'
import { run } from './errors'

export async function getUsername(userId) {
  const row = await run(supabase.from('profiles').select('username').eq('id', userId).maybeSingle())
  return row?.username ?? null
}

export async function updateBio(userId, bio) {
  await run(supabase.from('profiles').update({ bio }).eq('id', userId))
}
