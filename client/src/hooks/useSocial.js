import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { fire: 0, wrench: 0, eye: 0 }
const NONE  = { fire: false, wrench: false, eye: false }

// Pure helper: tally reaction rows into counts + which ones the user made
export function tallyReactions(rows, userId) {
  const counts = { ...EMPTY }
  const mine   = { ...NONE }
  for (const r of rows || []) {
    if (counts[r.type] === undefined) continue
    counts[r.type]++
    if (userId && r.user_id === userId) mine[r.type] = true
  }
  return { counts, mine }
}

// ── Reactions ─────────────────────────────────────────────

export function useReactions(vehicleId, userId) {
  const [reactions, setReactions] = useState(EMPTY)
  const [mine, setMine]           = useState(NONE)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!vehicleId) return
    let cancelled = false
    supabase
      .from('reactions')
      .select('type, user_id')
      .eq('vehicle_id', vehicleId)
      .then(({ data }) => {
        if (cancelled) return
        const { counts, mine } = tallyReactions(data, userId)
        setReactions(counts)
        setMine(mine)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [vehicleId, userId])

  const toggleReaction = async (type) => {
    if (!userId) return
    const isActive = mine[type]
    const delta    = isActive ? -1 : 1

    // Optimistic update
    setReactions(p => ({ ...p, [type]: p[type] + delta }))
    setMine(p => ({ ...p, [type]: !isActive }))

    const { error } = isActive
      ? await supabase.from('reactions')
          .delete()
          .eq('vehicle_id', vehicleId)
          .eq('user_id', userId)
          .eq('type', type)
      : await supabase.from('reactions')
          .insert({ vehicle_id: vehicleId, user_id: userId, type })

    // Roll back if the write failed
    if (error) {
      setReactions(p => ({ ...p, [type]: p[type] - delta }))
      setMine(p => ({ ...p, [type]: isActive }))
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
    let cancelled = false

    const load = async () => {
      const { count: total } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId)

      let isFollowing = false
      if (currentUserId && currentUserId !== targetUserId) {
        // maybeSingle: "not following" is zero rows, which is not an error
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
          .maybeSingle()
        isFollowing = !!data
      }

      if (cancelled) return
      setCount(total || 0)
      setFollowing(isFollowing)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [targetUserId, currentUserId])

  const toggleFollow = async () => {
    if (!currentUserId || currentUserId === targetUserId) return
    const wasFollowing = following
    const delta        = wasFollowing ? -1 : 1

    // Optimistic update
    setFollowing(!wasFollowing)
    setCount(p => p + delta)

    const { error } = wasFollowing
      ? await supabase.from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
      : await supabase.from('follows')
          .insert({ follower_id: currentUserId, following_id: targetUserId })

    // Roll back if the write failed
    if (error) {
      setFollowing(wasFollowing)
      setCount(p => p - delta)
    }
  }

  return { following, count, loading, toggleFollow }
}
