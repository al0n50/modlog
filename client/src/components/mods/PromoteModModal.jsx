import { useState } from 'react'
import { CATEGORIES } from './ModCategoryBadge'

export default function PromoteModModal({ item, onConfirm, onClose }) {
  const [form, setForm] = useState({
    name:         item.name         || '',
    category:     item.category     || 'Other',
    brand:        item.brand        || '',
    price:        item.estimated_price ? String(item.estimated_price) : '',
    install_date: '',
    notes:        '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleConfirm = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onConfirm({
        name:         form.name.trim(),
        category:     form.category,
        brand:        form.brand.trim()    || null,
        price:        form.price           ? parseFloat(form.price) : null,
        install_date: form.install_date    || null,
        notes:        form.notes.trim()    || null,
      })
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Confirm Installation</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Review and edit before marking as installed</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-3">

          {/* Carried-over notice */}
          <div className="bg-orange-900/30 border border-orange-800 rounded-lg px-3 py-2">
            <p className="text-orange-300 text-xs">✅ Pre-filled from your wishlist — edit anything that changed.</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Mod Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => set('category', cat)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    form.category === cat
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Brand + Price */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Brand</label>
              <input
                type="text"
                placeholder="e.g. Bilstein"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Actual Price ($)</label>
              <input
                type="number"
                placeholder="e.g. 420"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Install date */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Install Date</label>
            <input
              type="date"
              value={form.install_date}
              onChange={e => set('install_date', e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
            <textarea
              placeholder="Any changes from the original plan?"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={saving || !form.name.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {saving ? 'Installing...' : '✅ Mark as Installed'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}