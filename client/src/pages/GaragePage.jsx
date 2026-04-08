import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import AddVehicleModal from '../components/garage/AddVehicleModal'

export default function GaragePage() {
  const { user, signOut } = useAuthStore()
  const { vehicles, loading, fetchVehicles, addVehicle, deleteVehicle, addMod, deleteMod, addWishItem, deleteWishItem, promoteWishItem } = useGarageStore()

  const [showModal, setShowModal] = useState(false)
  const [modInputs, setModInputs] = useState({})
  const [wishInputs, setWishInputs] = useState({})
  const [activeTab, setActiveTab] = useState({})

  useEffect(() => {
    if (user) fetchVehicles(user.id)
  }, [user])

  const getTab = (id) => activeTab[id] ?? 'installed'

  const handleAddMod = async (vehicleId) => {
    const name = modInputs[vehicleId]?.trim()
    if (!name) return
    try {
      await addMod(vehicleId, { name })
      setModInputs(p => ({ ...p, [vehicleId]: '' }))
    } catch (e) { alert(e.message) }
  }

  const handleAddWish = async (vehicleId) => {
    const name = wishInputs[vehicleId]?.trim()
    if (!name) return
    try {
      await addWishItem(vehicleId, { name })
      setWishInputs(p => ({ ...p, [vehicleId]: '' }))
    } catch (e) { alert(e.message) }
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

        {/* Loading */}
        {loading && (
          <div className="text-center text-zinc-500 py-20">Loading your garage...</div>
        )}

        {/* Empty state */}
        {!loading && vehicles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🚗</p>
            <p className="text-zinc-400 mb-2">Your garage is empty.</p>
            <p className="text-zinc-600 text-sm">Add your first build below.</p>
          </div>
        )}

        {/* Vehicle Cards */}
        {vehicles.map(car => {
          const tab = getTab(car.id)
          return (
            <div key={car.id} className="bg-zinc-900 rounded-2xl overflow-hidden shadow-lg relative">

              {/* Delete button */}
              <button
                onClick={() => { if (confirm('Delete this build?')) deleteVehicle(car.id) }}
                className="absolute top-3 right-3 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold transition-colors"
              >✕</button>

              {/* Car image */}
              <img
                src={car.cover_image}
                alt={car.model}
                className="w-full h-48 object-cover"
                onError={e => e.target.src = 'https://placehold.co/600x400/1a1a1a/orange?text=No+Image'}
              />

              <div className="p-4">
                <h2 className="text-xl font-bold">{car.year} {car.make} {car.model}</h2>
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
                    <ul className="space-y-1 mb-3">
                      {car.mods?.length > 0
                        ? car.mods.map(mod => (
                          <li key={mod.id} className="flex items-center justify-between text-sm text-zinc-300 py-1 border-b border-zinc-800">
                            <span>🔧 {mod.name}</span>
                            <button onClick={() => deleteMod(car.id, mod.id)} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>
                          </li>
                        ))
                        : <p className="text-zinc-600 italic text-sm">Stock — no mods yet</p>
                      }
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a mod (e.g. Turbo)"
                        value={modInputs[car.id] || ''}
                        onChange={e => setModInputs(p => ({ ...p, [car.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddMod(car.id)}
                        className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button onClick={() => handleAddMod(car.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg text-sm font-medium transition-colors">Add</button>
                    </div>
                  </>
                )}

                {/* Wishlist */}
                {tab === 'wishlist' && (
                  <>
                    <ul className="space-y-1 mb-3">
                      {car.wishlist_items?.length > 0
                        ? car.wishlist_items.map(item => (
                          <li key={item.id} className="flex items-center gap-2 text-sm text-zinc-300 py-1 border-b border-zinc-800">
                            <span className="flex-1">🛒 {item.name}</span>
                            <button onClick={() => promoteWishItem(car.id, item)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition-colors">✅ Install</button>
                            <button onClick={() => deleteWishItem(car.id, item.id)} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>
                          </li>
                        ))
                        : <p className="text-zinc-600 italic text-sm">No parts on the wishlist yet</p>
                      }
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add to wishlist (e.g. Enkei Wheels)"
                        value={wishInputs[car.id] || ''}
                        onChange={e => setWishInputs(p => ({ ...p, [car.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddWish(car.id)}
                        className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button onClick={() => handleAddWish(car.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-lg text-sm font-medium transition-colors">Add</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Add Vehicle Modal */}
        {showModal && (
          <AddVehicleModal
            onSave={(data) => addVehicle(data, user.id)}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Add Build Button */}
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