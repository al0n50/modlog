import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import { decodeVIN } from '../lib/nhtsa'
import AddModForm from '../components/mods/AddModForm'
import AddWishForm from '../components/mods/AddWishForm'
import ModCategoryBadge from '../components/mods/ModCategoryBadge'
import PromoteModModal from '../components/mods/PromoteModModal'
import EditModModal from '../components/mods/EditModModal'
import BuildTimeline from '../components/timeline/BuildTimeline'
import AIAdvisor from '../components/garage/AIAdvisor'
import PhotoGallery from '../components/photos/PhotoGallery'
import { coverImage, hasRealCover } from '../lib/vehicles'
import { PHOTO_TYPES, uploadVehiclePhoto } from '../lib/storage'

const SECTIONS = ['Overview', 'Mods', 'Wishlist', 'Timeline', 'Photos']

export default function VehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    activeVehicle, loading, error,
    fetchVehicleById,
    addMod, deleteMod, updateMod,
    addWishItem, deleteWishItem, promoteWishItem,
    updateCoverImage,
    togglePublic,
  } = useGarageStore()

  const [section, setSection]             = useState('Overview')
  const [promoteItem, setPromoteItem]     = useState(null)
  const [editingMod, setEditingMod]       = useState(null)
  const [editingImage, setEditingImage]   = useState(false)
  const [newImageUrl, setNewImageUrl]     = useState('')
  const [savingImage, setSavingImage]     = useState(false)
  const [imageError, setImageError]       = useState('')
  const coverFileRef                      = useRef(null)

  useEffect(() => {
    if (id) fetchVehicleById(id)
  }, [id, fetchVehicleById])

  // Factory specs are saved with the car when it's added by VIN. Only older cars without
  // saved specs ask NHTSA (keyed by VIN so another car's specs are never shown).
  const vin = activeVehicle?.vin
  const savedSpecs = activeVehicle?.specs && Object.keys(activeVehicle.specs).length ? activeVehicle.specs : null
  const hasSavedSpecs = !!savedSpecs
  const [decoded, setDecoded] = useState({ vin: null, specs: null })
  useEffect(() => {
    if (!vin || hasSavedSpecs) return
    let cancelled = false
    decodeVIN(vin)
      .then(d => { if (!cancelled) setDecoded({ vin, specs: d.specs }) })
      .catch(() => { if (!cancelled) setDecoded({ vin, specs: null }) })   // decode failed — no specs
    return () => { cancelled = true }
  }, [vin, hasSavedSpecs])
  const specs = savedSpecs || (decoded.vin === vin ? decoded.specs : null)
  const specsLoading = !!vin && !savedSpecs && decoded.vin !== vin

  const handleSaveImage = async () => {
    if (!newImageUrl.trim()) return
    setSavingImage(true)
    setImageError('')
    try {
      await updateCoverImage(id, newImageUrl.trim())
      setEditingImage(false)
      setNewImageUrl('')
    } catch (e) { setImageError(e.message) }
    finally { setSavingImage(false) }
  }

  // The showcase photo: upload one from the phone or computer, saved in the car's photos
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeVehicle) return
    setSavingImage(true)
    setImageError('')
    try {
      const url = await uploadVehiclePhoto(activeVehicle.user_id, activeVehicle.id, file)
      await updateCoverImage(activeVehicle.id, url)
      setEditingImage(false)
    } catch (err) { setImageError(err.message || 'Upload failed. Try again.') }
    finally { setSavingImage(false) }
  }

  const groupedMods = (mods) =>
    (mods || []).reduce((acc, mod) => {
      const cat = mod.category || 'Other'
      acc[cat]  = acc[cat] ? [...acc[cat], mod] : [mod]
      return acc
    }, {})

  const buildCost = (mods) => {
    const total = (mods || []).reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0)
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  const wishBudget = (items) => {
    const total = (items || []).reduce((sum, i) => sum + (parseFloat(i.estimated_price) || 0), 0)
    return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }

  if (!loading && error) return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">🚧</p>
      <p className="text-zinc-300">{error}</p>
      <button onClick={() => navigate('/')}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
        Back to your garage
      </button>
    </div>
  )

  if (loading || !activeVehicle || activeVehicle.id !== id) return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12">
      <div className="w-full h-64 bg-zinc-900 animate-pulse" />
      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-3">
        <div className="h-8 w-2/3 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-4 w-1/3 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    </div>
  )

  const car     = activeVehicle
  // Only the owner can change a build; visitors to a public build get a read-only page
  const isOwner = !!user && user.id === car.user_id
  const grouped = groupedMods(car.mods)
  const cost    = buildCost(car.mods)
  const budget  = wishBudget(car.wishlist_items)

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12">

      {/* Hero: the car's showcase photo */}
      <div className="relative w-full h-64 bg-zinc-900">
        <img
          src={coverImage(car)}
          alt={car.model}
          className="w-full h-full object-cover"
          onError={e => e.target.src = 'https://placehold.co/800x400/1a1a1a/orange?text=No+Image'}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        {/* No photo yet: invite the owner to add one */}
        {isOwner && !hasRealCover(car) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => coverFileRef.current?.click()}
              disabled={savingImage}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-lg shadow-orange-500/30 transition-colors"
            >
              {savingImage ? 'Uploading…' : '📷 Add a photo of your car'}
            </button>
          </div>
        )}
        {isOwner && (
          <input ref={coverFileRef} type="file" accept={PHOTO_TYPES.join(',')} className="hidden" onChange={handleUploadCover} aria-label="Upload a photo of your car" />
        )}

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm transition-colors backdrop-blur-sm"
        >
          ← Garage
        </button>

        {/* Top right buttons */}
        {isOwner && <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => togglePublic(car.id, car.is_public)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm ${
              car.is_public
                ? 'bg-green-600/90 hover:bg-green-700 text-white'
                : 'bg-black/60 hover:bg-black/80 text-white'
            }`}
          >
            {car.is_public ? '🌎 Public' : '🔒 Private'}
          </button>
          <button
            onClick={() => setEditingImage(p => !p)}
            className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm transition-colors backdrop-blur-sm"
          >
            📷 Change photo
          </button>
        </div>}
      </div>

      {/* Change the showcase photo: upload one, or paste a link */}
      {isOwner && editingImage && (
        <div className="max-w-2xl mx-auto px-4 mt-3 space-y-2">
          <button
            onClick={() => coverFileRef.current?.click()}
            disabled={savingImage}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {savingImage ? 'Uploading…' : '📷 Upload a photo'}
          </button>
          <p className="text-xs text-zinc-500">Or paste a link to a photo:</p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://…"
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
            >✕</button>
          </div>
        </div>
      )}
      {isOwner && imageError && (
        <div className="max-w-2xl mx-auto px-4 mt-2">
          <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{imageError}</p>
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
            {car.is_public && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://modlog.vercel.app/vehicle/${car.id}`)
                  alert('Build link copied!')
                }}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                🔗 Share
              </button>
            )}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mt-5 mb-6 bg-zinc-900 p-1 rounded-xl">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                section === s ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
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
                { label: 'Mods Installed', value: car.mods?.length ?? 0,          color: 'text-green-400'  },
                { label: 'On Wishlist',    value: car.wishlist_items?.length ?? 0, color: 'text-orange-400' },
                { label: 'Categories',     value: Object.keys(grouped).length,     color: 'text-blue-400'   },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-900 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* AI Advisor */}
            {isOwner && <AIAdvisor vehicle={car} />}
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
                      {isOwner && <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => setEditingMod(mod)}
                          aria-label={`Edit ${mod.name}`}
                          className="text-zinc-500 hover:text-orange-400 text-xs transition-colors"
                        >✏️</button>
                        <button
                          onClick={() => deleteMod(car.id, mod.id).catch(e => alert(e.message))}
                          aria-label={`Delete ${mod.name}`}
                          className="text-zinc-700 hover:text-red-400 text-xs transition-colors"
                        >✕</button>
                      </div>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {isOwner && <div className="bg-zinc-900 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Add Mod</h3>
              <AddModForm vehicleId={car.id} onAdd={addMod} />
            </div>}
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
                {isOwner && <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setPromoteItem({ vehicleId: car.id, item })}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded transition-colors"
                  >✅ Install</button>
                  <button
                    onClick={() => setEditingMod(item)}
                    aria-label={`Edit ${item.name}`}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                  >✏️ Edit</button>
                  <button
                    onClick={() => deleteWishItem(car.id, item.id).catch(e => alert(e.message))}
                    className="text-zinc-600 hover:text-red-400 text-xs text-center transition-colors"
                  >✕</button>
                </div>}
              </div>
            ))}
            {isOwner && <div className="bg-zinc-900 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Add to Wishlist</h3>
              <AddWishForm vehicleId={car.id} onAdd={addWishItem} />
            </div>}
          </div>
        )}

        {/* ── Timeline ── */}
        {section === 'Timeline' && (
          <div className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Build History</h2>
            <BuildTimeline vehicleId={car.id} />
          </div>
        )}

        {/* ── Photos ── */}
        {section === 'Photos' && (
          <div className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Build Gallery
            </h2>
            <PhotoGallery vehicle={car} canEdit={isOwner} />
          </div>
        )}
      </div>
      {/* Edit any mod, done or planned */}
      {editingMod && (
        <EditModModal
          mod={editingMod}
          onSave={(row) => updateMod(car.id, editingMod.id, row)}
          onClose={() => setEditingMod(null)}
        />
      )}

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