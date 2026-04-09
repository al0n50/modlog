import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useGarageStore } from '../store/useGarageStore'
import { supabase } from '../lib/supabase'
import ModCategoryBadge from '../components/mods/ModCategoryBadge'

export default function ProfilePage() {
  const { username } = useParams()
  const navigate     = useNavigate()
  const { user, signOut } = useAuthStore()
  const { fetchPublicVehiclesByUser } = useGarageStore()

  const [profile, setProfile]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio]           = useState('')
  const [savingBio, setSavingBio] = useState(false)

  // If no username param, redirect to own profile
  useEffect(() => {
    if (!username && user) {
      const load = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        if (data) navigate(`/profile/${data.username}`, { replace: true })
      }
      load()
    }
  }, [username, user])

  useEffect(() => {
    if (!username) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { profile, vehicles } = await fetchPublicVehiclesByUser(username)
        setProfile(profile)
        setVehicles(vehicles)
        setBio(profile.bio || '')
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [username])

  const isOwnProfile = user && profile && user.id === profile.id

  const handleSaveBio = async () => {
    setSavingBio(true)
    const { error } = await supabase
      .from('profiles')
      .update({ bio })
      .eq('id', user.id)
    if (!error) {
      setProfile(p => ({ ...p, bio }))
      setEditingBio(false)
    }
    setSavingBio(false)
  }

  const buildCost = (mods) => {
    const total = mods?.reduce((s, m) => s + (parseFloat(m.price) || 0), 0) ?? 0
    return total > 0 ? `$${total.toLocaleString()}` : null
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500">Loading profile...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-white font-bold text-xl mb-2">User Not Found</p>
        <p className="text-zinc-500 text-sm mb-4">{error}</p>
        <Link to="/" className="text-orange-400 hover:text-orange-300 text-sm">← Back to garage</Link>
      </div>
    </div>
  )

  const totalMods = vehicles.reduce((s, v) => s + (v.mods?.length ?? 0), 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Garage</Link>
          {isOwnProfile && (
            <button
              onClick={signOut}
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >Sign Out</button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl font-black text-white shrink-0">
              {profile?.username?.[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white">
                {profile?.display_name || profile?.username}
              </h1>
              <p className="text-zinc-500 text-sm">@{profile?.username}</p>

              {/* Bio */}
              {!editingBio && (
                <div className="mt-2">
                  <p className="text-zinc-400 text-sm">
                    {profile?.bio || (isOwnProfile ? 'No bio yet.' : '')}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="text-xs text-zinc-600 hover:text-orange-400 transition-colors mt-1"
                    >
                      {profile?.bio ? '✏️ Edit bio' : '+ Add bio'}
                    </button>
                  )}
                </div>
              )}

              {editingBio && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell the community about your builds..."
                    rows={2}
                    className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {savingBio ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingBio(false); setBio(profile?.bio || '') }}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
            {[
              { label: 'Public Builds', value: vehicles.length,  color: 'text-orange-400' },
              { label: 'Total Mods',    value: totalMods,         color: 'text-green-400'  },
              { label: 'Member Since',  value: new Date(profile?.created_at).getFullYear(), color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Share profile link */}
        {isOwnProfile && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Your public profile</p>
              <p className="text-xs text-zinc-500 font-mono">modlog.vercel.app/profile/{profile?.username}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://modlog.vercel.app/profile/${profile?.username}`)
                alert('Link copied!')
              }}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy
            </button>
          </div>
        )}

        {/* Public builds */}
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
            {isOwnProfile ? 'Your Public Builds' : `${profile?.username}'s Builds`}
          </h2>

          {vehicles.length === 0 && (
            <div className="text-center py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-4xl mb-3">🔒</p>
              <p className="text-zinc-400 text-sm font-medium">No public builds yet</p>
              {isOwnProfile && (
                <p className="text-zinc-600 text-xs mt-1">
                  Go to a vehicle's detail page and toggle it public to share it.
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {vehicles.map((car, i) => {
              const cost = buildCost(car.mods)
              return (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800"
                >
                  <Link to={`/vehicle/${car.id}`}>
                    <div className="relative">
                      <img
                        src={car.cover_image}
                        alt={car.model}
                        className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                        onError={e => e.target.src = 'https://placehold.co/600x400/1a1a1a/orange?text=No+Image'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 px-4 pb-3">
                        <h3 className="text-lg font-black text-white">{car.year} {car.make} {car.model}</h3>
                        {car.trim && <p className="text-zinc-400 text-xs">{car.trim}</p>}
                      </div>
                    </div>
                  </Link>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      <span className="text-white font-semibold">{car.mods?.length ?? 0}</span> mods
                    </span>
                    {cost && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <span className="text-xs font-mono text-orange-400">{cost}</span>
                      </>
                    )}
                    <div className="ml-auto flex gap-1.5 flex-wrap justify-end">
                      {car.mods?.slice(0, 3).map(mod => (
                        <ModCategoryBadge key={mod.id} category={mod.category} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}