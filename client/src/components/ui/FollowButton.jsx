import { motion } from 'framer-motion'
import { useFollow } from '../../hooks/useSocial'

export default function FollowButton({ targetUserId, currentUserId }) {
  const { following, count, loading, toggleFollow } = useFollow(targetUserId, currentUserId)

  // Don't show if viewing own profile
  if (!currentUserId || currentUserId === targetUserId) {
    return count > 0 ? (
      <span className="text-xs text-zinc-500">{count} follower{count !== 1 ? 's' : ''}</span>
    ) : null
  }

  if (loading) return (
    <div className="h-9 w-24 bg-zinc-800 rounded-xl animate-pulse" />
  )

  return (
    <div className="flex items-center gap-2">
      {count > 0 && (
        <span className="text-xs text-zinc-500">{count} follower{count !== 1 ? 's' : ''}</span>
      )}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={toggleFollow}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
          following
            ? 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-red-600 hover:text-red-400'
            : 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
        }`}
      >
        {following ? 'Following ✓' : '+ Follow'}
      </motion.button>
    </div>
  )
}