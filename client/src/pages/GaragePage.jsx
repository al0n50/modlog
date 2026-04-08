import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import AddVehicleModal from '../components/garage/AddVehicleModal'
import AddModForm from '../components/mods/AddModForm'
import AddWishForm from '../components/mods/AddWishForm'
import ModCategoryBadge from '../components/mods/ModCategoryBadge'
import PromoteModModal from '../components/mods/PromoteModModal'

export default function GaragePage() {
  const { user, signOut } = useAuthStore()
  const {
    vehicles, loading,
    fetchVehicles, addVehicle, deleteVehicle,
    addMod, deleteMod,
    addWishItem, deleteWishItem, promoteWishItem
  } = useGarageStore()

  const [showModal, setShowModal]       = useState(false)
  const [promoteItem, setPromoteItem]   = useState(null) // { vehicleId, item }
  const [activeTab, setActiveTab]       = useState({})

  useEffect(() => {
    if (user) fetchVehicles(user.id)
  }, [user])

  const getTab = (id) => activeTab[id] ?? 'installed'

  const buildCost = (mods) => {
    const total = mods?.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  const wishBudget = (items) => {
    const total = items?.reduce((sum, i) => sum + (parseFloat(i.estimated_price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-orange-500">🏎️ ModLog</h1>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={signOut} className="text-xs text-zinc-500 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {loading && (
          <div className="text-center text-zinc-500 py-20">Loading your garage...</div>
        )}

        {!loading && vehicles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🚗</p>
            <p className="text-zinc-400 mb-2">Your garage is empty.</p>
            <p className="text-zinc-600 text-sm">Add your first build below.</p>
          </div>
        )}

        {vehicles.map(car => {
          const tab    = getTab(car.id)
          const cost   = buildCost(car.mods)
          const budget = wishBudget(car.wishlist_items)

          return (
            <div key={car.id} className="bg-zinc-900 rounded-2xl overflow-hidden shadow-lg relative">

              <button
                onClick={() => { if (confirm('Delete this build?')) deleteVehicle(car.id) }}
                className="absolute top-3 right-3 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold transition-colors"
              >✕</button>

              <img
                src={car.cover_image}
                alt={car.model}
                className="w-full h-48 object-cover"
                onError={e => e.target.src = 'https://placehold.co/600x400/1a1a1a/orange?text=No+Image'}
              />

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="text-xl font-bold">{car.year} {car.make} {car.model}</h2>
                  {cost && (
                    <span className="text-xs bg-zinc-800 text-orange-400 border border-zinc-700 px-2 py-1 rounded-lg whitespace-nowrap font-mono">
                      💰 {cost}
                    </span>
                  )}
                </div>
                {car.trim && <p className="text-zinc-400 text-sm mb-3">Trim: {car.trim}</p>}

                {/* Tabs */}
                <div className="flex rounded-lg overflow-hidden border border-zinc-700 mb-4">
                  {['installed', 'wishlist'].map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(p => ({ ...p, [car.id]: t }))}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {t === 'installed'
                        ? `✅ Installed (${car.mods?.length ?? 0})`
                        : `🛒 Wishlist (${car.wishlist_items?.length ?? 0})`}
                    </button>
                  ))}
                </div>

                {/* Installed Mods */}
                {tab === 'installed' && (
                  <>
                    <ul className="space-y-2 mb-2">
                      {car.mods?.length > 0
                        ? car.mods.map(mod => (
                          <li key={mod.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-zinc-800">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-white">🔧 {mod.name}</span>
                                <ModCategoryBadge category={mod.category} />
                              </div>
                              <div className="flex gap-3 flex-wrap">
                                {mod.brand        && <span className="text-xs text-zinc-500">{mod.brand}</span>}
                                {mod.price        && <span className="text-xs text-orange-400 font-mono">${parseFloat(mod.price).toLocaleString()}</span>}
                                {mod.install_date && <span className="text-xs text-zinc-600">{new Date(mod.install_date).toLocaleDateString()}</span>}
                              </div>
                              {mod.notes && <p className="text-xs text-zinc-600 italic">{mod.notes}</p>}
                            </div>
                            <button
                              onClick={() => deleteMod(car.id, mod.id)}
                              className="text-zinc-700 hover:text-red-400 text-xs transition-colors shrink-0 mt-1"
                            >✕</button>
                          </li>
                        ))
                        : <p className="text-zinc-600 italic text-sm">Stock — no mods yet</p>
                      }
                    </ul>
                    <AddModForm vehicleId={car.id} onAdd={addMod} />
                  </>
                )}

                {/* Wishlist */}
                {tab === 'wishlist' && (
                  <>
                    {/* Wishlist budget */}
                    {budget && (
                      <div className="flex items-center justify-between mb-3 bg-zinc-800 rounded-lg px-3 py-2">
                        <span className="text-xs text-zinc-400">Estimated budget</span>
                        <span className="text-sm font-mono text-orange-400 font-semibold">{budget}</span>
                      </div>
                    )}

                    <ul className="space-y-2 mb-2">
                      {car.wishlist_items?.length > 0
                        ? car.wishlist_items.map(item => (
                          <li key={item.id} className="flex items-start gap-2 py-1.5 border-b border-zinc-800">
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Priority stars */}
                                <span className="text-xs">
                                  {'⭐'.repeat(item.priority || 1)}
                                </span>
                                <span className="text-sm text-white">🛒 {item.name}</span>
                                <ModCategoryBadge category={item.category} />
                              </div>
                              <div className="flex gap-3 flex-wrap items-center">
                                {item.brand           && <span className="text-xs text-zinc-500">{item.brand}</span>}
                                {item.estimated_price && <span className="text-xs text-orange-400 font-mono">~${parseFloat(item.estimated_price).toLocaleString()}</span>}
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                                  >
                                    🛍 Buy Now
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => setPromoteItem({ vehicleId: car.id, item })}
                                className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition-colors"
                              >✅ Install</button>
                              <button
                                onClick={() => deleteWishItem(car.id, item.id)}
                                className="text-zinc-600 hover:text-red-400 text-xs transition-colors text-center"
                              >✕</button>
                            </div>
                          </li>
                        ))
                        : <p className="text-zinc-600 italic text-sm">No parts on the wishlist yet</p>
                      }
                    </ul>

                    <AddWishForm vehicleId={car.id} onAdd={addWishItem} />
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Promote Modal */}
        {promoteItem && (
          <PromoteModModal
            item={promoteItem.item}
            onConfirm={(modData) => promoteWishItem(promoteItem.vehicleId, promoteItem.item, modData)}
            onClose={() => setPromoteItem(null)}
          />
        )}

        {/* Add Vehicle Modal */}
        {showModal && (
          <AddVehicleModal
            onSave={(data) => addVehicle(data, user.id)}
            onClose={() => setShowModal(false)}
          />
        )}

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg"
        >
          + Add New Build
        </button>

      </main>
    </div>
  )
}