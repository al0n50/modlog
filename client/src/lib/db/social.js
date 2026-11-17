import { supabase } from '../supabase'
import { run, runCount } from './errors'

export async function listReactions(vehicleId) {
  return (await run(supabase.from('reactions').select('type, user_id').eq('vehicle_id', vehicleId))) || []
}
export async function addReaction(vehicleId, userId, type) {
  await run(supabase.from('reactions').insert({ vehicle_id: vehicleId, user_id: userId, type }))
}
export async function removeReaction(vehicleId, userId, type) {
  await run(supabase.from('reactions').delete().eq('vehicle_id', vehicleId).eq('user_id', userId).eq('type', type))
}

export async function followerCount(userId) {
  return runCount(supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId))
}
export async function isFollowing(followerId, followingId) {
  // maybeSingle: "not following" is zero rows, which is not an error
  return !!(await run(supabase.from('follows').select('follower_id')
    .eq('follower_id', followerId).eq('following_id', followingId).maybeSingle()))
}
export async function follow(followerId, followingId) {
  await run(supabase.from('follows').insert({ follower_id: followerId, following_id: followingId }))
}
export async function unfollow(followerId, followingId) {
  await run(supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId))
}
