import { useState } from 'react'
import { CATEGORIES } from './ModCategoryBadge'

const EMPTY = {
  name: '', category: 'Other', brand: '', estimated_price: '', url: '', priority: 1
}

const STARS = [1, 2, 3]

export default function AddWishForm({ vehicleId, onAdd }) {
  const [form, setForm]               = useState(EMPTY)
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving]           = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onAdd(vehicleId, {
        name:            form.name.trim(),
        category:        form.category,
        brand:           form.brand.trim() || null,
        estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
        url:             form.url.trim() || null,
        priority:        form.priority,
      })
      setForm(EMPTY)
      setShowDetails(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-2 mt-3">

      {/* Quick-add row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add to wishlist (e.g. Enkei Wheels)"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !showDetails && handleAdd()}
          className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '...' : 'Add'}
        </button>
      </div>

      {/* Category selector */}
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

      {/* Priority selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Priority:</span>
        {STARS.map(s => (
          <button
            key={s}
            onClick={() => set('priority', s)}
            className={`text-lg transition-transform hover:scale-110 ${s <= form.priority ? 'opacity-100' : 'opacity-25'}`}
          >⭐</button>
        ))}
      </div>

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(p => !p)}
        className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1"
      >
        {showDetails ? '▲ Hide details' : '▼ Add details (brand, price, link)'}
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Brand</label>
              <input
                type="text"
                placeholder="e.g. Enkei"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Est. Price ($)</label>
              <input
                type="number"
                placeholder="e.g. 800"
                value={form.estimated_price}
                onChange={e => set('estimated_price', e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Buy Link (Optional)</label>
            <input
              type="url"
              placeholder="https://store.com/product"
              value={form.url}
              onChange={e => set('url', e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}