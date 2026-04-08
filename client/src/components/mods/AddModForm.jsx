import { useState } from 'react'
import { CATEGORIES } from './ModCategoryBadge'

const EMPTY = {
  name: '', category: 'Other', brand: '', price: '', install_date: '', notes: ''
}

export default function AddModForm({ vehicleId, onAdd }) {
  const [form, setForm]           = useState(EMPTY)
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving]       = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onAdd(vehicleId, {
        name:         form.name.trim(),
        category:     form.category,
        brand:        form.brand.trim() || null,
        price:        form.price ? parseFloat(form.price) : null,
        install_date: form.install_date || null,
        notes:        form.notes.trim() || null,
      })
      setForm(EMPTY)
      setShowDetails(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-2 mt-3">

      {/* Quick-add row: name + category + button */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a mod (e.g. Coilovers)"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !showDetails && handleAdd()}
          className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '...' : 'Add'}
        </button>
      </div>

      {/* Category selector — always visible */}
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

      {/* Add Details toggle */}
      <button
        onClick={() => setShowDetails(p => !p)}
        className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1"
      >
        {showDetails ? '▲ Hide details' : '▼ Add details (brand, price, date, notes)'}
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="space-y-2 pt-1">
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
              <label className="text-xs text-zinc-500 mb-1 block">Price ($)</label>
              <input
                type="number"
                placeholder="e.g. 450"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Install Date</label>
            <input
              type="date"
              value={form.install_date}
              onChange={e => set('install_date', e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
            <textarea
              placeholder="e.g. Installed at 45k miles, paired with new strut mounts"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}