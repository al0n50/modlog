import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadVehiclePhoto, deleteVehiclePhoto, listVehiclePhotos } from '../../lib/storage'
import { useGarageStore } from '../../store/useGarageStore'

export default function PhotoGallery({ vehicle, userId }) {
  const { updateCoverImage } = useGarageStore()
  const [photos, setPhotos]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [lightbox, setLightbox]     = useState(null) // url of photo in lightbox
  const [error, setError]           = useState('')
  const fileRef                     = useRef(null)

  useEffect(() => {
    loadPhotos()
  }, [vehicle.id])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const data = await listVehiclePhotos(userId, vehicle.id)
      setPhotos(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const urls = await Promise.all(
        files.map(f => uploadVehiclePhoto(userId, vehicle.id, f))
      )
      setPhotos(p => [...p, ...urls.map((url, i) => ({ name: files[i].name, url }))])
    } catch (e) { setError(e.message) }
    finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (photo) => {
    if (!confirm('Delete this photo?')) return
    try {
      await deleteVehiclePhoto(photo.url)
      setPhotos(p => p.filter(ph => ph.url !== photo.url))
      if (lightbox === photo.url) setLightbox(null)
    } catch (e) { setError(e.message) }
  }

  const handleSetCover = async (url) => {
    try {
      await updateCoverImage(vehicle.id, url)
      alert('Cover photo updated!')
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-4">

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/20"
        >
          {uploading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >⚙️</motion.span>
              Uploading...
            </>
          ) : (
            <>📸 Upload Photos</>
          )}
        </motion.button>
        <span className="text-xs text-zinc-600">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="aspect-square bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div className="text-center py-10 bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-700">
          <p className="text-4xl mb-2">📷</p>
          <p className="text-zinc-400 text-sm font-medium">No photos yet</p>
          <p className="text-zinc-600 text-xs mt-1">Upload photos of your build</p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.url}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative group aspect-square"
            >
              <img
                src={photo.url}
                alt={`Build photo ${i + 1}`}
                className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(photo.url)}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleSetCover(photo.url)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 rounded-lg transition-colors"
                  title="Set as cover"
                >🖼 Cover</button>
                <button
                  onClick={() => handleDelete(photo)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-lg transition-colors"
                  title="Delete photo"
                >🗑</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Full size"
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors"
            >✕</button>
            {/* Lightbox actions */}
            <div className="absolute bottom-6 flex gap-3">
              <button
                onClick={() => { handleSetCover(lightbox); setLightbox(null) }}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >🖼 Set as Cover</button>
              <button
                onClick={() => handleDelete({ url: lightbox })}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >🗑 Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}