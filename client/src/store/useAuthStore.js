import { create } from 'zustand'
import { supabase } from '../lib/supabase'

let initialized = false

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    // Guard against double-subscribing (React StrictMode runs effects twice in dev)
    if (initialized) return
    initialized = true
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_e, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    })
    if (error) throw error

    // Ensure profile exists even if trigger is slow
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username || email.split('@')[0],
        display_name: username || email.split('@')[0],
      }, { onConflict: 'id' })
    }

    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))