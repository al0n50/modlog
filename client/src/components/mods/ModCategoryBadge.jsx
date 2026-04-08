export const CATEGORIES = [
  'Engine',
  'Suspension',
  'Exterior',
  'Interior',
  'Wheels & Tires',
  'Audio',
  'Lighting',
  'Brakes',
  'Exhaust',
  'Transmission',
  'Other',
]

const COLORS = {
  'Engine':          'bg-red-900/60 text-red-300 border-red-700',
  'Suspension':      'bg-blue-900/60 text-blue-300 border-blue-700',
  'Exterior':        'bg-purple-900/60 text-purple-300 border-purple-700',
  'Interior':        'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  'Wheels & Tires':  'bg-orange-900/60 text-orange-300 border-orange-700',
  'Audio':           'bg-pink-900/60 text-pink-300 border-pink-700',
  'Lighting':        'bg-cyan-900/60 text-cyan-300 border-cyan-700',
  'Brakes':          'bg-rose-900/60 text-rose-300 border-rose-700',
  'Exhaust':         'bg-amber-900/60 text-amber-300 border-amber-700',
  'Transmission':    'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  'Other':           'bg-zinc-800 text-zinc-400 border-zinc-600',
}

export default function ModCategoryBadge({ category }) {
  const cat = category || 'Other'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COLORS[cat] ?? COLORS['Other']}`}>
      {cat}
    </span>
  )
}