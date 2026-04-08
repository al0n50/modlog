import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function AuthPage() {
  const [mode, setMode] = useState('login')       // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return }
        await signUp(email, password, username)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl">

        {/* Logo */}
        <h1 className="text-3xl font-bold text-center text-white mb-1">🏎️ ModLog</h1>
        <p className="text-center text-zinc-400 text-sm mb-8">Your virtual garage</p>

        {/* Tab toggle */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}