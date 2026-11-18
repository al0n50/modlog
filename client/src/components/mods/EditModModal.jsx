import { useRef, useState } from 'react'
import { CATEGORIES } from '../../lib/categories'
import { editForm, LIMITS, localToday, modUpdate } from '../../lib/modEdit'

const field = 'w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500'

// Edit any mod, done or planned. Switching the status moves it between Mods and Wishlist.
export default function EditModModal({ mod, onSave, onClose }) {
  const [form, setForm]     = useState(() => editForm(mod))
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  // Ignore repeat clicks while a save is in flight (state updates land too late to stop them)
  const busy = useRef(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (busy.current) return
    const { row, error: problem } = modUpdate(form)
    if (problem) return setError(problem)
    busy.current = true
    setSaving(true)
    setError('')
    try {
      await onSave(row)
      onClose()
    } catch (e) { setError(e.message || 'Couldn’t save. Try again.') }
    finally { busy.current = false; setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Edit mod">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Edit mod</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-3">
          {/* Done or planned */}
          <div className="grid grid-cols-2 gap-1 bg-zinc-800 rounded-lg p-1" role="group" aria-label="Status">
            {[['done', '✅ Installed'], ['planned', '🛒 Planned']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => set('status', v)}
                aria-pressed={form.status === v}
                className={`py-1.5 rounded-md text-sm transition-colors ${form.status === v ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
              >{label}</button>
            ))}
          </div>

          <div>
            <label htmlFor="edit-mod-name" className="text-xs text-zinc-500 mb-1 block">Mod name *</label>
            <input id="edit-mod-name" type="text" maxLength={LIMITS.name} value={form.name} onChange={e => set('name', e.target.value)} className={field} />
          </div>

          <div>
            <span className="text-xs text-zinc-500 mb-1 block">Category</span>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => set('category', cat)}
                  aria-pressed={form.category === cat}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    form.category === cat ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >{cat}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="edit-mod-brand" className="text-xs text-zinc-500 mb-1 block">Brand</label>
              <input id="edit-mod-brand" type="text" maxLength={LIMITS.brand} value={form.brand} onChange={e => set('brand', e.target.value)} className={field} />
            </div>
            <div className="flex-1">
              <label htmlFor="edit-mod-price" className="text-xs text-zinc-500 mb-1 block">{form.status === 'done' ? 'Price paid ($)' : 'Estimated price ($)'}</label>
              <input id="edit-mod-price" type="text" inputMode="decimal" value={form.price} onChange={e => set('price', e.target.value)} className={field} />
            </div>
          </div>

          {form.status === 'done' && (
            <div>
              <label htmlFor="edit-mod-date" className="text-xs text-zinc-500 mb-1 block">Install date</label>
              <input id="edit-mod-date" type="date" max={localToday()} value={form.install_date} onChange={e => set('install_date', e.target.value)} className={field} />
            </div>
          )}

          <div>
            <label htmlFor="edit-mod-notes" className="text-xs text-zinc-500 mb-1 block">Notes</label>
            <textarea id="edit-mod-notes" rows={2} maxLength={LIMITS.notes} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${field} resize-none`} />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={onClose} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
