import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Reactions ─────────────────────────────────────────────

export function useReactions(vehicleId, userId) {
  const [reactions, setReactions] = useState({ fire: 0, wrench: 0, eye: 0 })
  const [mine, setMine]           = useState({ fire: false, wrench: false, eye: false })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!vehicleId) return
    fetchReactions()
  }, [vehicleId, userId])

  const fetchReactions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reactions')
      .select('type, user_id')
      .eq('vehicle_id', vehicleId)

    if (!data) { setLoading(false); return }

    // Count each type
    const counts = { fire: 0, wrench: 0, eye: 0 }
    const userReacted = { fire: false, wrench: false, eye: false }

    data.forEach(r => {
      if (counts[r.type] !== undefined) counts[r.type]++
      if (r.user_id === userId) userReacted[r.type] = true
    })

    setReactions(counts)
    setMine(userReacted)
    setLoading(false)
  }

  const toggleReaction = async (type) => {
    if (!userId) return
    const isActive = mine[type]

    // Optimistic update
    setReactions(p => ({ ...p, [type]: p[type] + (isActive ? -1 : 1) }))
    setMine(p => ({ ...p, [type]: !isActive }))

    if (isActive) {
      await supabase.from('reactions')
        .delete()
        .eq('vehicle_id', vehicleId)
        .eq('user_id', userId)
        .eq('type', type)
    } else {
      await supabase.from('reactions')
        .insert({ vehicle_id: vehicleId, user_id: userId, type })
    }
  }

  return { reactions, mine, loading, toggleReaction }
}

// ── Following ─────────────────────────────────────────────

export function useFollow(targetUserId, currentUserId) {
  const [following, setFollowing] = useState(false)
  const [count, setCount]         = useState(0)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!targetUserId) return
    fetchFollow()
  }, [targetUserId, currentUserId])

  const fetchFollow = async () => {
    setLoading(true)

    const { count: total } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId)

    setCount(total || 0)

    if (currentUserId && currentUserId !== targetUserId) {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single()
      setFollowing(!!data)
    }

    setLoading(false)
  }

  const toggleFollow = async () => {
    if (!currentUserId || currentUserId === targetUserId) return

    // Optimistic update
    setFollowing(p => !p)
    setCount(p => p + (following ? -1 : 1))

    if (following) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUserId, following_id: targetUserId })
    }
  }

  return { following, count, loading, toggleFollow }
}