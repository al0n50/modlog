import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EVENT_ICONS = {
  mod_added:          { icon: '🔧', color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800' },
  mod_removed:        { icon: '🗑️', color: 'text-red-400',    bg: 'bg-red-900/30 border-red-800'     },
  wishlist_promoted:  { icon: '⭐', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800' },
}

const DEFAULT = { icon: '📝', color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' }

export default function BuildTimeline({ vehicleId }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicleId) return
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('build_events')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
      setEvents(data || [])
      setLoading(false)
    }
    fetch()
  }, [vehicleId])

  if (loading) return <p className="text-zinc-600 text-sm italic">Loading timeline...</p>

  if (events.length === 0) return (
    <p className="text-zinc-600 text-sm italic">No events yet — start adding mods!</p>
  )

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />

      <ul className="space-y-4 pl-10">
        {events.map(ev => {
          const style = EVENT_ICONS[ev.event_type] ?? DEFAULT
          const date  = new Date(ev.created_at)

          return (
            <li key={ev.id} className="relative">
              {/* Dot on the line */}
              <div className={`absolute -left-6 w-5 h-5 rounded-full border flex items-center justify-center text-xs ${style.bg}`}>
                {style.icon}
              </div>

              <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                <p className={`text-sm font-medium ${style.color}`}>{ev.description}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}