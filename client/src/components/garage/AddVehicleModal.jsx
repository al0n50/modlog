import { useState } from 'react'
import { decodeVIN } from '../../lib/nhtsa'

// mode: null | 'vin' | 'manual'
export default function AddVehicleModal({ onSave, onClose }) {
  const [mode, setMode]       = useState(null)
  const [vin, setVin]         = useState('')
  const [decoding, setDecoding] = useState(false)
  const [vinError, setVinError] = useState('')
  const [vinSuccess, setVinSuccess] = useState('')
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    vin: '', year: '', make: '', model: '', trim: '', cover_image: ''
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── VIN decode ────────────────────────────────────────────
  const handleDecode = async () => {
    setVinError('')
    setVinSuccess('')
    setDecoding(true)
    try {
      const data = await decodeVIN(vin)
      setForm({
        vin:         data.vin,
        year:        String(data.year),
        make:        data.make,
        model:       data.model,
        trim:        data.trim,
        cover_image: '',
        _specs:      data.specs,   // stored for future spec sheet
      })
      setVinSuccess(`✅ Decoded: ${data.year} ${data.make} ${data.model}`)
      setMode('manual')            // drop into form to confirm/edit
    } catch (e) {
      setVinError(e.message)
    } finally {
      setDecoding(false)
    }
  }

  // ── Save vehicle ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.year || !form.make || !form.model) {
      setVinError('Year, Make, and Model are required.')
      return
    }
    setSaving(true)
    try {
      await onSave({
        vin:         form.vin || null,
        year:        parseInt(form.year),
        make:        form.make.trim(),
        model:       form.model.trim(),
        trim:        form.trim.trim(),
        cover_image: form.cover_image.trim() ||
          `https://placehold.co/600x400/1a1a1a/orange?text=${encodeURIComponent(form.make + ' ' + form.model)}`,
      })
      onClose()
    } catch (e) {
      setVinError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Add New Build</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Step 0: Choose path ── */}
          {mode === null && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm text-center">How do you want to add your vehicle?</p>

              <button
                onClick={() => setMode('vin')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔍</span>
                <div className="text-left">
                  <div className="font-bold">Decode VIN</div>
                  <div className="text-xs text-orange-200 font-normal">Auto-fill from your 17-digit VIN</div>
                </div>
              </button>

              <button
                onClick={() => setMode('manual')}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">✏️</span>
                <div className="text-left">
                  <div className="font-bold">Enter Manually</div>
                  <div className="text-xs text-zinc-400 font-normal">Type in your year, make, model</div>
                </div>
              </button>
            </div>
          )}

          {/* ── Step 1a: VIN input ── */}
          {mode === 'vin' && (
            <div className="space-y-3">
              <label className="text-sm text-zinc-400">Enter your 17-character VIN</label>
              <input
                type="text"
                placeholder="e.g. 1HGBH41JXMN109186"
                maxLength={17}
                value={vin}
                onChange={e => { setVin(e.target.value.toUpperCase()); setVinError(''); setVinSuccess('') }}
                onKeyDown={e => e.key === 'Enter' && handleDecode()}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500 tracking-widest uppercase"
              />

              {/* Character counter */}
              <p className={`text-xs text-right ${vin.length === 17 ? 'text-green-400' : 'text-zinc-500'}`}>
                {vin.length}/17
              </p>

              {vinError  && <p className="text-red-400 text-sm">{vinError}</p>}
              {vinSuccess && <p className="text-green-400 text-sm">{vinSuccess}</p>}

              <button
                onClick={handleDecode}
                disabled={vin.length !== 17 || decoding}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {decoding ? 'Decoding...' : 'Decode VIN'}
              </button>

              <button
                onClick={() => { setMode(null); setVinError(''); setVin('') }}
                className="w-full text-zinc-500 hover:text-white text-sm py-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Step 1b / 2: Manual form (also used after VIN decode) ── */}
          {mode === 'manual' && (
            <div className="space-y-3">
              {vinSuccess && (
                <div className="bg-green-900/40 border border-green-700 rounded-lg px-4 py-2">
                  <p className="text-green-400 text-sm">{vinSuccess}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Review and edit below before saving.</p>
                </div>
              )}

              {[
                { key: 'vin',         label: 'VIN (Optional)',        mono: true  },
                { key: 'year',        label: 'Year *',                type: 'number' },
                { key: 'make',        label: 'Make *',                },
                { key: 'model',       label: 'Model *',               },
                { key: 'trim',        label: 'Trim (Optional)',        },
                { key: 'cover_image', label: 'Image URL (Optional)',   },
              ].map(({ key, label, mono, type }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key] || ''}
                    onChange={e => set(key, e.target.value)}
                    className={`w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 ${mono ? 'font-mono tracking-widest uppercase' : ''}`}
                  />
                </div>
              ))}

              {vinError && <p className="text-red-400 text-sm">{vinError}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors mt-2"
              >
                {saving ? 'Saving...' : 'Save Build'}
              </button>

              <button
                onClick={() => { setMode(null); setVinError(''); setVinSuccess('') }}
                className="w-full text-zinc-500 hover:text-white text-sm py-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}