import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGarageStore } from '../store/useGarageStore'
import ModCategoryBadge from '../components/mods/ModCategoryBadge'
import { VehicleCardSkeleton } from '../components/ui/Skeleton'

export default function DiscoverPage() {
  const { fetchPublicVehicles } = useGarageStore()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPublicVehicles()
        setVehicles(data)
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const buildCost = (mods) => {
    const total = mods?.reduce((s, m) => s + (parseFloat(m.price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString()}` : null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white leading-none">Discover</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Community builds</p>
          </div>
          <span className="text-xs text-zinc-600">{vehicles.length} builds</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <VehicleCardSkeleton key={i} />)}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && vehicles.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-4">🌎</div>
            <h2 className="text-2xl font-black text-white mb-2">No Public Builds Yet</h2>
            <p className="text-zinc-500 text-sm">Be the first to share your build.</p>
            <Link to="/" className="inline-block mt-4 text-orange-400 text-sm hover:text-orange-300 transition-colors">
              Go to your garage →
            </Link>
          </motion.div>
        )}

        {vehicles.map((car, i) => {
          const cost = buildCost(car.mods)
          const username = car.profiles?.username

          return (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl"
            >
              {/* Cover image */}
              <div className="relative">
                <Link to={`/vehicle/${car.id}`}>
                  <img
                    src={car.cover_image}
                    alt={car.model}
                    className="w-full h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                    onError={e => e.target.src = 'https://placehold.co/600x400/1a1a1a/orange?text=No+Image'}
                  />
                </Link>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent pointer-events-none" />

                {/* Builder badge */}
                {username && (
                  <Link to={`/profile/${username}`}>
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5 hover:bg-black/80 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-white text-xs font-medium">@{username}</span>
                    </div>
                  </Link>
                )}

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                  <Link to={`/vehicle/${car.id}`}>
                    <h2 className="text-xl font-black text-white hover:text-orange-400 transition-colors">
                      {car.year} {car.make} {car.model}
                    </h2>
                  </Link>
                  {car.trim && <p className="text-zinc-400 text-xs">{car.trim}</p>}
                </div>
              </div>

              <div className="px-4 py-3">
                {/* Stats */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-zinc-500">
                    <span className="text-white font-semibold">{car.mods?.length ?? 0}</span> mods
                  </span>
                  {cost && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs font-mono text-orange-400">{cost} invested</span>
                    </>
                  )}
                  <div className="ml-auto">
                    <Link to={`/vehicle/${car.id}`}>
                      <span className="text-xs text-zinc-600 hover:text-orange-400 transition-colors">
                        View Build →
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Top mods preview */}
                {car.mods?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {car.mods.slice(0, 4).map(mod => (
                      <ModCategoryBadge key={mod.id} category={mod.category} />
                    ))}
                    {car.mods.length > 4 && (
                      <span className="text-xs text-zinc-600 self-center">
                        +{car.mods.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </main>
    </div>
  )
}