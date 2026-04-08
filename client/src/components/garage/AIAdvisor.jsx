import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getModRecommendations } from '../../lib/gemini'
import ModCategoryBadge from '../mods/ModCategoryBadge'

const DIFFICULTY_COLORS = {
  'Bolt-On':              'text-green-400 bg-green-900/30 border-green-800',
  'Moderate':             'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  'Professional Required':'text-red-400 bg-red-900/30 border-red-800',
}

export default function AIAdvisor({ vehicle }) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [recommendations, setRecs]    = useState(null)
  const [error, setError]             = useState('')
  const [budget, setBudget]           = useState('')

  const handleGetAdvice = async () => {
    setError('')
    setRecs(null)
    setLoading(true)
    try {
      const recs = await getModRecommendations({
        year:          vehicle.year,
        make:          vehicle.make,
        model:         vehicle.model,
        trim:          vehicle.trim,
        installedMods: vehicle.mods,
        wishlistItems: vehicle.wishlist_items,
        budget:        budget || null,
      })
      setRecs(recs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

      {/* Header toggle */}
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-base">
            🤖
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">AI Build Advisor</p>
            <p className="text-xs text-zinc-500">Powered by Gemini</p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500 text-sm"
        >▼</motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-800 pt-4 space-y-4">

              {/* Context summary */}
              <div className="bg-zinc-800/50 rounded-xl px-3 py-2 text-xs text-zinc-400 space-y-0.5">
                <p>🚗 <span className="text-white">{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ''}</span></p>
                <p>🔧 <span className="text-white">{vehicle.mods?.length ?? 0}</span> installed mods · <span className="text-white">{vehicle.wishlist_items?.length ?? 0}</span> on wishlist</p>
              </div>

              {/* Budget input */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">
                  Budget for next mod <span className="text-zinc-700">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetAdvice}
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 text-white font-bold px-4 rounded-lg text-sm transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="inline-block"
                        >⚙️</motion.span>
                        Thinking...
                      </span>
                    ) : '✨ Get Advice'}
                  </motion.button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-zinc-800 rounded-xl p-4 space-y-2 animate-pulse">
                      <div className="h-4 w-1/2 bg-zinc-700 rounded" />
                      <div className="h-3 w-full bg-zinc-700 rounded" />
                      <div className="h-3 w-4/5 bg-zinc-700 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {recommendations && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-zinc-600 text-center">
                    AI recommendations based on your {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>

                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-4 space-y-2"
                    >
                      {/* Name + badges */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            {i + 1}. {rec.name}
                          </span>
                          <ModCategoryBadge category={rec.category} />
                        </div>
                        {rec.estimatedCost > 0 && (
                          <span className="text-sm font-mono text-orange-400 font-bold shrink-0">
                            ~${rec.estimatedCost.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Difficulty badge */}
                      {rec.difficulty && (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[rec.difficulty] ?? DIFFICULTY_COLORS['Moderate']}`}>
                          🔩 {rec.difficulty}
                        </span>
                      )}

                      {/* Reason */}
                      <p className="text-xs text-zinc-400 leading-relaxed">{rec.reason}</p>

                      {/* Synergy */}
                      {rec.synergy && (
                        <div className="bg-orange-900/20 border border-orange-900/40 rounded-lg px-2 py-1.5">
                          <p className="text-xs text-orange-300">
                            ⚡ <span className="font-medium">Synergy:</span> {rec.synergy}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Regenerate */}
                  <button
                    onClick={handleGetAdvice}
                    className="w-full text-xs text-zinc-600 hover:text-orange-400 transition-colors py-1"
                  >
                    🔄 Generate new recommendations
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}