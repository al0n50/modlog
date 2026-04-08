import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ModCategoryBadge from '../mods/ModCategoryBadge'
import AddModForm from '../mods/AddModForm'
import AddWishForm from '../mods/AddWishForm'
import PromoteModModal from '../mods/PromoteModModal'

export default function VehicleCard({ car, onDelete, onAddMod, onDeleteMod, onAddWish, onDeleteWish, onPromote, index = 0 }) {
  const [activeTab, setActiveTab]     = useState('installed')
  const [promoteItem, setPromoteItem] = useState(null)

  const buildCost = () => {
    const total = car.mods?.reduce((s, m) => s + (parseFloat(m.price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null
  }

  const wishBudget = () => {
    const total = car.wishlist_items?.reduce((s, i) => s + (parseFloat(i.estimated_price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null
  }

  const cost   = buildCost()
  const budget = wishBudget()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
        className="bg-zinc-900 rounded-2xl overflow-hidden shadow-xl relative border border-zinc-800 hover:border-zinc-700 transition-colors"
      >
        {/* Orange accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 z-10 rounded-l-2xl" />

        {/* Delete */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { if (confirm('Delete this build?')) onDelete(car.id) }}
          className="absolute top-3 right-3 z-10 bg-red-600/90 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold transition-colors backdrop-blur-sm"
        >✕</motion.button>

        {/* Cover image */}
        <div className="relative">
          <Link to={`/vehicle/${car.id}`}>
            <img
              src={car.cover_image}
              alt={car.model}
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onError={e => e.target.src = 'https://placehold.co/600x400/1a1a1a/orange?text=No+Image'}
            />
          </Link>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

          {/* Title over image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pl-5">
            <Link to={`/vehicle/${car.id}`}>
              <motion.h2
                whileHover={{ color: '#f97316' }}
                className="text-xl font-black tracking-tight text-white cursor-pointer transition-colors drop-shadow-lg"
              >
                {car.year} {car.make} {car.model}
              </motion.h2>
            </Link>
            {car.trim && (
              <p className="text-zinc-400 text-xs mt-0.5">{car.trim}</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pl-5">
          {/* Stats row */}
          <div className="flex items-center gap-3 py-2 mb-3 border-b border-zinc-800">
            <span className="text-xs text-zinc-500">
              <span className="text-white font-semibold">{car.mods?.length ?? 0}</span> mods
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-xs text-zinc-500">
              <span className="text-white font-semibold">{car.wishlist_items?.length ?? 0}</span> planned
            </span>
            {cost && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-xs font-mono text-orange-400 font-semibold">{cost}</span>
              </>
            )}
            <div className="ml-auto">
              <Link to={`/vehicle/${car.id}`}>
                <motion.span
                  whileHover={{ x: 3 }}
                  className="text-xs text-zinc-600 hover:text-orange-400 transition-colors"
                >
                  View Build →
                </motion.span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-zinc-700/60 mb-4 bg-zinc-800/50">
            {['installed', 'wishlist'].map(t => (
              <motion.button
                key={t}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  activeTab === t
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === 'installed'
                  ? `✅ Installed (${car.mods?.length ?? 0})`
                  : `🛒 Wishlist (${car.wishlist_items?.length ?? 0})`}
              </motion.button>
            ))}
          </div>

          {/* Installed Mods */}
          {activeTab === 'installed' && (
            <>
              <ul className="space-y-2 mb-2">
                {car.mods?.length > 0
                  ? car.mods.map(mod => (
                    <li key={mod.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-zinc-800/60 last:border-0">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-medium">🔧 {mod.name}</span>
                          <ModCategoryBadge category={mod.category} />
                        </div>
                        <div className="flex gap-3 flex-wrap">
                          {mod.brand        && <span className="text-xs text-zinc-500">{mod.brand}</span>}
                          {mod.price        && <span className="text-xs text-orange-400 font-mono">${parseFloat(mod.price).toLocaleString()}</span>}
                          {mod.install_date && <span className="text-xs text-zinc-600">{new Date(mod.install_date).toLocaleDateString()}</span>}
                        </div>
                        {mod.notes && <p className="text-xs text-zinc-600 italic">{mod.notes}</p>}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onDeleteMod(car.id, mod.id, mod.name)}
                        className="text-zinc-700 hover:text-red-400 text-xs transition-colors shrink-0 mt-1"
                      >✕</motion.button>
                    </li>
                  ))
                  : <p className="text-zinc-600 italic text-sm py-2">Stock — no mods yet</p>
                }
              </ul>
              <AddModForm vehicleId={car.id} onAdd={onAddMod} />
            </>
          )}

          {/* Wishlist */}
          {activeTab === 'wishlist' && (
            <>
              {budget && (
                <div className="flex items-center justify-between mb-3 bg-zinc-800/60 rounded-lg px-3 py-2">
                  <span className="text-xs text-zinc-400">Estimated budget</span>
                  <span className="text-sm font-mono text-orange-400 font-semibold">{budget}</span>
                </div>
              )}
              <ul className="space-y-2 mb-2">
                {car.wishlist_items?.length > 0
                  ? car.wishlist_items.map(item => (
                    <li key={item.id} className="flex items-start gap-2 py-1.5 border-b border-zinc-800/60 last:border-0">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs">{'⭐'.repeat(item.priority || 1)}</span>
                          <span className="text-sm text-white font-medium">🛒 {item.name}</span>
                          <ModCategoryBadge category={item.category} />
                        </div>
                        <div className="flex gap-3 flex-wrap items-center">
                          {item.brand           && <span className="text-xs text-zinc-500">{item.brand}</span>}
                          {item.estimated_price && <span className="text-xs text-orange-400 font-mono">~${parseFloat(item.estimated_price).toLocaleString()}</span>}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors">
                              🛍 Buy Now
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setPromoteItem({ vehicleId: car.id, item })}
                          className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition-colors"
                        >✅ Install</motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDeleteWish(car.id, item.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs text-center transition-colors"
                        >✕</motion.button>
                      </div>
                    </li>
                  ))
                  : <p className="text-zinc-600 italic text-sm py-2">No parts on the wishlist yet</p>
                }
              </ul>
              <AddWishForm vehicleId={car.id} onAdd={onAddWish} />
            </>
          )}
        </div>
      </motion.div>

      {/* Promote modal */}
      {promoteItem && (
        <PromoteModModal
          item={promoteItem.item}
          onConfirm={(modData) => onPromote(promoteItem.vehicleId, promoteItem.item, modData)}
          onClose={() => setPromoteItem(null)}
        />
      )}
    </>
  )
}