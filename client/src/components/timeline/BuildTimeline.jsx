import { useEffect, useState } from 'react'
import { listBuildEvents } from '../../lib/db'

const EVENT_ICONS = {
  mod_added:          { icon: '🔧', color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800' },
  mod_removed:        { icon: '🗑️', color: 'text-red-400',    bg: 'bg-red-900/30 border-red-800'     },
  wishlist_promoted:  { icon: '⭐', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800' },
  mod_planned:        { icon: '🛒', color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800'     },
  plan_removed:       { icon: '↩️', color: 'text-zinc-400',   bg: 'bg-zinc-800 border-zinc-700'        },
}

const DEFAULT = { icon: '📝', color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' }

export default function BuildTimeline({ vehicleId }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!vehicleId) return
    const fetch = async () => {
      setLoading(true)
      setError('')
      try {
        setEvents(await listBuildEvents(vehicleId))
      } catch (e) { setError(e.message) }
      setLoading(false)
    }
    fetch()
  }, [vehicleId])

  if (loading) return <p className="text-zinc-600 text-sm italic">Loading timeline...</p>
  if (error) return <p className="text-red-400 text-sm">{error}</p>

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