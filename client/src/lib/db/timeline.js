import { supabase } from '../supabase'
import { run } from './errors'

// A car's build history, newest first. Written by the database whenever mods change.
export async function listBuildEvents(vehicleId) {
  return (await run(supabase.from('build_events').select('*')
    .eq('vehicle_id', vehicleId).order('created_at', { ascending: false }))) || []
}
