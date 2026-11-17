import { useState, useEffect } from 'react'
import * as db from '../lib/db'

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
    db.listReactions(vehicleId)
      .catch(() => [])
      .then(rows => {
        if (cancelled) return
        const { counts, mine } = tallyReactions(rows, userId)
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

    try {
      if (isActive) await db.removeReaction(vehicleId, userId, type)
      else          await db.addReaction(vehicleId, userId, type)
    } catch {
      // Roll back if the write failed
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
      const total = await db.followerCount(targetUserId).catch(() => 0)
      const isFollowing = currentUserId && currentUserId !== targetUserId
        ? await db.isFollowing(currentUserId, targetUserId).catch(() => false)
        : false

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

    try {
      if (wasFollowing) await db.unfollow(currentUserId, targetUserId)
      else              await db.follow(currentUserId, targetUserId)
    } catch {
      // Roll back if the write failed
      setFollowing(wasFollowing)
      setCount(p => p - delta)
    }
  }

  return { following, count, loading, toggleFollow }
}
