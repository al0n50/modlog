import { motion } from 'framer-motion'
import { useReactions } from '../../hooks/useSocial'

const REACTION_TYPES = [
  { type: 'fire',   emoji: '🔥', label: 'Fire'   },
  { type: 'wrench', emoji: '🔧', label: 'Respect' },
  { type: 'eye',    emoji: '👁',  label: 'Watching'},
]

export default function ReactionBar({ vehicleId, userId }) {
  const { reactions, mine, loading, toggleReaction } = useReactions(vehicleId, userId)

  if (loading) return (
    <div className="flex gap-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-9 w-20 bg-zinc-800 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="flex gap-2">
      {REACTION_TYPES.map(({ type, emoji, label }) => (
        <motion.button
          key={type}
          whileTap={{ scale: 0.88 }}
          onClick={() => toggleReaction(type)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
            mine[type]
              ? 'bg-orange-500/20 border-orange-500 text-orange-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
          }`}
        >
          <motion.span
            animate={{ scale: mine[type] ? [1, 1.4, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            {emoji}
          </motion.span>
          <span>{reactions[type] > 0 ? reactions[type] : label}</span>
        </motion.button>
      ))}
    </div>
  )
}