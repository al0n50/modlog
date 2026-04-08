import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import VehicleCard from '../components/garage/VehicleCard'
import AddVehicleModal from '../components/garage/AddVehicleModal'
import { VehicleCardSkeleton } from '../components/ui/Skeleton'

export default function GaragePage() {
  const { user } = useAuthStore()
  const {
    vehicles, loading,
    fetchVehicles, addVehicle, deleteVehicle,
    addMod, deleteMod,
    addWishItem, deleteWishItem, promoteWishItem,
  } = useGarageStore()

  const [showModal, setShowModal]     = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    if (user) fetchVehicles(user.id)
  }, [user])

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
  }

  // Garage-wide stats
  const totalMods  = vehicles.reduce((s, v) => s + (v.mods?.length ?? 0), 0)
  const totalSpent = vehicles.reduce((s, v) =>
    s + (v.mods?.reduce((ms, m) => ms + (parseFloat(m.price) || 0), 0) ?? 0), 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏎️</span>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">ModLog</h1>
              <p className="text-xs text-zinc-500 leading-none mt-0.5">Virtual Garage</p>
            </div>
          </div>
          {/* Avatar initial */}
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstall && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="bg-orange-500 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg shadow-orange-500/20"
            >
              <div>
                <p className="text-white text-sm font-bold">Install ModLog</p>
                <p className="text-orange-200 text-xs">Add to your home screen</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="bg-white text-orange-500 text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  Install
                </button>
                <button
                  onClick={() => setShowInstall(false)}
                  className="text-orange-200 text-xs px-2"
                >✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Garage stats bar */}
        {!loading && vehicles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: 'Builds',     value: vehicles.length,                                                    color: 'text-orange-400' },
              { label: 'Total Mods', value: totalMods,                                                          color: 'text-green-400'  },
              { label: 'Invested',   value: totalSpent > 0 ? `$${totalSpent.toLocaleString()}` : '—',           color: 'text-blue-400'   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-zinc-600 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => <VehicleCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && vehicles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-4">🏁</div>
            <h2 className="text-2xl font-black text-white mb-2">Garage is Empty</h2>
            <p className="text-zinc-500 text-sm mb-1">No builds logged yet.</p>
            <p className="text-zinc-600 text-xs">Hit the button below to add your first car.</p>
          </motion.div>
        )}

        {/* Vehicle cards */}
        {vehicles.map((car, i) => (
          <VehicleCard
            key={car.id}
            car={car}
            index={i}
            onDelete={deleteVehicle}
            onAddMod={addMod}
            onDeleteMod={deleteMod}
            onAddWish={addWishItem}
            onDeleteWish={deleteWishItem}
            onPromote={promoteWishItem}
          />
        ))}

        {/* Add build button */}
        {!loading && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => setShowModal(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-colors text-lg tracking-tight shadow-lg shadow-orange-500/20"
          >
            + Add New Build
          </motion.button>
        )}
      </main>

      {/* Add Vehicle Modal */}
      {showModal && (
        <AddVehicleModal
          onSave={(data) => addVehicle(data, user.id)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}