import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import { decodeVIN } from '../lib/nhtsa'
import AddModForm from '../components/mods/AddModForm'
import AddWishForm from '../components/mods/AddWishForm'
import ModCategoryBadge from '../components/mods/ModCategoryBadge'
import PromoteModModal from '../components/mods/PromoteModModal'
import BuildTimeline from '../components/timeline/BuildTimeline'

const SECTIONS = ['Overview', 'Mods', 'Wishlist', 'Timeline']

export default function VehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    activeVehicle, loading,
    fetchVehicleById,
    addMod, deleteMod,
    addWishItem, deleteWishItem, promoteWishItem,
    updateCoverImage,
  } = useGarageStore()

  const [section, setSection]         = useState('Overview')
  const [specs, setSpecs]             = useState(null)
  const [specsLoading, setSpecsLoading] = useState(false)
  const [promoteItem, setPromoteItem] = useState(null)
  const [editingImage, setEditingImage] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [savingImage, setSavingImage] = useState(false)

  useEffect(() => {
    if (id) fetchVehicleById(id)
  }, [id])

  // Auto-fetch specs if vehicle has a VIN
  useEffect(() => {
    if (!activeVehicle?.vin || specs) return
    const fetch = async () => {
      setSpecsLoading(true)
      try {
        const data = await decodeVIN(activeVehicle.vin)
        setSpecs(data.specs)
      } catch { /* no VIN or decode failed — specs stay null */ }
      finally { setSpecsLoading(false) }
    }
    fetch()
  }, [activeVehicle])

  const handleSaveImage = async () => {
    if (!newImageUrl.trim()) return
    setSavingImage(true)
    try {
      await updateCoverImage(id, newImageUrl.trim())
      setEditingImage(false)
      setNewImageUrl('')
    } catch (e) { alert(e.message) }
    finally { setSavingImage(false) }
  }

  // Group mods by category
  const groupedMods = (mods) => {
    return (mods || []).reduce((acc, mod) => {
      const cat = mod.category || 'Other'
      acc[cat]  = acc[cat] ? [...acc[cat], mod] : [mod]
      return acc
    }, {})
  }

  const buildCost = (mods) => {
    const total = (mods || []).reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0)
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  const wishBudget = (items) => {
    const total = (items || []).reduce((sum, i) => sum + (parseFloat(i.estimated_price) || 0), 0)
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  if (loading || !activeVehicle) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500">Loading build...</p>
    </div>
  )

  const car     = activeVehicle
  const grouped = groupedMods(car.mods)
  const cost    = buildCost(car.mods)
  const budget  = wishBudget(car.wishlist_items)

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12">

      {/* Hero image */}
      <div className="relative w-full h-64 bg-zinc-900">
        <img
          src={car.cover_image}
          alt={car.model}
          className="w-full h-full object-cover"
          onError={e => e.target.src = 'https://placehold.co/800x400/1a1a1a/orange?text=No+Image'}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm transition-colors backdrop-blur-sm"
        >
          ← Garage
        </button>

        {/* Edit image button */}
        <button
          onClick={() => setEditingImage(p => !p)}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm transition-colors backdrop-blur-sm"
        >
          📷 Edit Photo
        </button>
      </div>

      {/* Edit image input */}
      {editingImage && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste new image URL"
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSaveImage}
              disabled={savingImage || !newImageUrl.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 rounded-lg text-sm font-medium transition-colors"
            >
              {savingImage ? '...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingImage(false)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 rounded-lg text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 mt-4">

        {/* Title + stats */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h1 className="text-3xl font-bold">{car.year} {car.make} {car.model}</h1>
            {car.trim && <p className="text-zinc-400 text-sm mt-1">Trim: {car.trim}</p>}
            {car.vin  && <p className="text-zinc-600 text-xs font-mono mt-0.5">VIN: {car.vin}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {cost   && <span className="text-sm font-mono text-orange-400 bg-zinc-800 px-2 py-1 rounded-lg">💰 {cost}</span>}
            {budget && <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">🛒 {budget} planned</span>}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mt-5 mb-6 bg-zinc-900 p-1 rounded-xl">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${section === s ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {section === 'Overview' && (
          <div className="space-y-4">
            {/* Spec sheet */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Factory Specs</h2>
              {!car.vin && (
                <p className="text-zinc-600 text-sm italic">No VIN on file — add a VIN to see factory specs.</p>
              )}
              {car.vin && specsLoading && (
                <p className="text-zinc-600 text-sm italic">Loading specs...</p>
              )}
              {car.vin && !specsLoading && specs && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    ['Engine',       specs.engine       || '—'],
                    ['Cylinders',    specs.cylinders    || '—'],
                    ['Fuel Type',    specs.fuel         || '—'],
                    ['Drivetrain',   specs.drivetrain   || '—'],
                    ['Transmission', specs.transmission || '—'],
                    ['Body',         specs.bodyClass    || '—'],
                    ['Doors',        specs.doors        || '—'],
                    ['Built In',     specs.plantCountry || '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-zinc-600">{label}</p>
                      <p className="text-sm text-white font-medium">{val}</p>
                    </div>
                  ))}
                </div>
              )}
              {car.vin && !specsLoading && !specs && (
                <p className="text-zinc-600 text-sm italic">Could not load specs for this VIN.</p>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Mods Installed', value: car.mods?.length ?? 0, color: 'text-green-400' },
                { label: 'On Wishlist',    value: car.wishlist_items?.length ?? 0, color: 'text-orange-400' },
                { label: 'Categories',     value: Object.keys(grouped).length, color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-900 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Mods ── */}
        {section === 'Mods' && (
          <div className="space-y-4">
            {Object.keys(grouped).length === 0 && (
              <p className="text-zinc-600 italic text-sm">Stock — no mods yet</p>
            )}
            {Object.entries(grouped).map(([cat, mods]) => (
              <div key={cat} className="bg-zinc-900 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ModCategoryBadge category={cat} />
                  <span className="text-xs text-zinc-600">{mods.length} item{mods.length !== 1 ? 's' : ''}</span>
                </div>
                <ul className="space-y-2">
                  {mods.map(mod => (
                    <li key={mod.id} className="flex items-start justify-between gap-2 py-1 border-b border-zinc-800 last:border-0">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-white">🔧 {mod.name}</span>
                        <div className="flex gap-3 flex-wrap">
                          {mod.brand        && <span className="text-xs text-zinc-500">{mod.brand}</span>}
                          {mod.price        && <span className="text-xs text-orange-400 font-mono">${parseFloat(mod.price).toLocaleString()}</span>}
                          {mod.install_date && <span className="text-xs text-zinc-600">{new Date(mod.install_date).toLocaleDateString()}</span>}
                        </div>
                        {mod.notes && <p className="text-xs text-zinc-600 italic">{mod.notes}</p>}
                      </div>
                      <button
                        onClick={() => deleteMod(car.id, mod.id, mod.name)}
                        className="text-zinc-700 hover:text-red-400 text-xs transition-colors shrink-0"
                      >✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Add Mod</h3>
              <AddModForm vehicleId={car.id} onAdd={addMod} />
            </div>
          </div>
        )}

        {/* ── Wishlist ── */}
        {section === 'Wishlist' && (
          <div className="space-y-3">
            {budget && (
              <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3">
                <span className="text-sm text-zinc-400">Estimated budget</span>
                <span className="text-sm font-mono text-orange-400 font-semibold">{budget}</span>
              </div>
            )}
            {car.wishlist_items?.length === 0 && (
              <p className="text-zinc-600 italic text-sm">No parts on the wishlist yet</p>
            )}
            {car.wishlist_items?.map(item => (
              <div key={item.id} className="bg-zinc-900 rounded-xl p-3 flex items-start gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs">{'⭐'.repeat(item.priority || 1)}</span>
                    <span className="text-sm text-white">🛒 {item.name}</span>
                    <ModCategoryBadge category={item.category} />
                  </div>
                  <div className="flex gap-3 flex-wrap items-center">
                    {item.brand           && <span className="text-xs text-zinc-500">{item.brand}</span>}
                    {item.estimated_price && <span className="text-xs text-orange-400 font-mono">~${parseFloat(item.estimated_price).toLocaleString()}</span>}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline">
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
                    className="text-zinc-600 hover:text-red-400 text-xs text-center transition-colors"
                  >✕</button>
                </div>
              </div>
            ))}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Add to Wishlist</h3>
              <AddWishForm vehicleId={car.id} onAdd={addWishItem} />
            </div>
          </div>
        )}

        {/* ── Timeline ── */}
        {section === 'Timeline' && (
          <div className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Build History</h2>
            <BuildTimeline vehicleId={car.id} />
          </div>
        )}
      </div>

      {/* Promote modal */}
      {promoteItem && (
        <PromoteModModal
          item={promoteItem.item}
          onConfirm={(modData) => promoteWishItem(promoteItem.vehicleId, promoteItem.item, modData)}
          onClose={() => setPromoteItem(null)}
        />
      )}
    </div>
  )
}